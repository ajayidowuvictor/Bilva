"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { configuredProvider, friendlyAiMessage, generateJson } from "@/lib/ai";
import { AiError, type AiResult } from "@/lib/ai/types";
import { extractJson, parseBrief, type Brief } from "@/lib/brief";
import { readStrategy, type Strategy } from "@/lib/strategy";
import {
  DRAFT_PROMPT_VERSION,
  buildDraftRequest,
  parseDraft,
  readDraft,
  type Draft,
} from "@/lib/draft";
import {
  CRITIQUE_PROMPT_VERSION,
  MAX_REVISIONS,
  buildCritiqueRequest,
  parseCritique,
  readCritique,
  type Critique,
} from "@/lib/critique";
import {
  UUID,
  aiAllowanceError,
  describeAiText,
  type Db,
} from "./shared";

export type ReviewActionState = { error: string | null };

const DB_UPDATE_MESSAGE =
  "Bilva's database needs its Phase 5 update first. Please tell the person who set up Bilva.";

type Context =
  | {
      ok: true;
      db: Db;
      userId: string;
      projectId: string;
      brief: Brief;
      facts: string;
      strategyId: string;
      strategy: Strategy;
      draftId: string;
      draftVersion: number;
      draft: Draft;
      critiqueId: string | null;
      critique: Critique | null;
    }
  | { ok: false; error: string };

async function loadContext(formData: FormData): Promise<Context> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!UUID.test(projectId)) {
    return { ok: false, error: "We could not find that project." };
  }

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  // Row-level security means these only return the signed-in user's rows.
  // select("*") so a missing newer column never hides the project.
  const { data: project } = await db
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: "We could not find that project." };
  }
  const facts =
    typeof project.extra_facts === "string" ? project.extra_facts : "";

  const { data: briefRow } = await db
    .from("briefs")
    .select("brief_data, approved_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!briefRow || !briefRow.approved_at) {
    return { ok: false, error: "Please approve the brief first." };
  }
  const brief = parseBrief(briefRow.brief_data);
  if (!brief) {
    return { ok: false, error: "We could not read the saved brief." };
  }

  const { data: chosenRow } = await db
    .from("strategies")
    .select("id, strategy_data")
    .eq("project_id", projectId)
    .not("chosen_at", "is", null)
    .limit(1)
    .maybeSingle();
  const strategy = chosenRow ? readStrategy(chosenRow.strategy_data) : null;
  if (!chosenRow || !strategy) {
    return { ok: false, error: "Please choose an angle first." };
  }

  const { data: draftRow } = await db
    .from("drafts")
    .select("id, version, draft_data")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const draft = draftRow ? readDraft(draftRow.draft_data) : null;
  if (!draftRow || !draft) {
    return { ok: false, error: "Please write the first draft first." };
  }

  const { data: critiqueRow, error: critiqueError } = await db
    .from("critiques")
    .select("id, critique_data")
    .eq("draft_id", draftRow.id)
    .maybeSingle();
  if (critiqueError) {
    return { ok: false, error: DB_UPDATE_MESSAGE };
  }

  return {
    ok: true,
    db,
    userId: user.id,
    projectId,
    brief,
    facts,
    strategyId: chosenRow.id as string,
    strategy,
    draftId: draftRow.id as string,
    draftVersion: draftRow.version as number,
    draft,
    critiqueId: critiqueRow ? (critiqueRow.id as string) : null,
    critique: critiqueRow ? readCritique(critiqueRow.critique_data) : null,
  };
}

async function recordUsage(
  ctx: { db: Db; userId: string; projectId: string },
  operation: string,
  result: AiResult | null,
) {
  await ctx.db.from("usage_events").insert({
    user_id: ctx.userId,
    project_id: ctx.projectId,
    operation,
    provider: result?.provider ?? configuredProvider() ?? "unknown",
    model_id: result?.model ?? null,
    input_tokens: result?.inputTokens ?? null,
    output_tokens: result?.outputTokens ?? null,
    status: result ? "success" : "error",
  });
}

export async function critiqueDraftAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const ctx = await loadContext(formData);
  if (!ctx.ok) return { error: ctx.error };
  if (ctx.critiqueId) {
    return { error: "This draft has already been reviewed." };
  }
  if (!configuredProvider()) {
    return { error: friendlyAiMessage(new AiError("not_configured", "")) };
  }
  const blocked = await aiAllowanceError(ctx.db, ctx.userId);
  if (blocked) return { error: blocked };

  let result: AiResult;
  try {
    result = await generateJson(
      buildCritiqueRequest({
        brief: ctx.brief,
        facts: ctx.facts,
        strategy: ctx.strategy,
        draft: ctx.draft,
      }),
    );
  } catch (error) {
    console.error(
      "AI call failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    await recordUsage(ctx, "critique_build", null);
    return { error: friendlyAiMessage(error) };
  }
  await recordUsage(ctx, "critique_build", result);

  const json = extractJson(result.text);
  const critique = parseCritique(json);
  if (!critique) {
    console.error(
      "Critique not usable:",
      JSON.stringify({ model: result.model, ...describeAiText(result.text, json) }),
    );
    return { error: friendlyAiMessage(new AiError("bad_response", "")) };
  }

  const { error: insertError } = await ctx.db.from("critiques").insert({
    project_id: ctx.projectId,
    user_id: ctx.userId,
    draft_id: ctx.draftId,
    critique_data: critique,
    prompt_version: CRITIQUE_PROMPT_VERSION,
    model_id: result.model,
  });
  if (insertError) {
    console.error("Saving critique failed:", insertError.message);
    return { error: "We could not save the review. Please try again." };
  }

  revalidatePath(`/projects/${ctx.projectId}`);
  return { error: null };
}

export async function reviseDraftAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const ctx = await loadContext(formData);
  if (!ctx.ok) return { error: ctx.error };
  if (!ctx.critique) {
    return { error: "Please have the draft reviewed first." };
  }

  const { count, error: countError } = await ctx.db
    .from("drafts")
    .select("id", { count: "exact", head: true })
    .eq("project_id", ctx.projectId)
    .eq("kind", "revision");
  if (countError) {
    return { error: DB_UPDATE_MESSAGE };
  }
  if ((count ?? 0) >= MAX_REVISIONS) {
    return {
      error: `Bilva has already improved this advert ${MAX_REVISIONS} times. You can still write a new version with your own note.`,
    };
  }

  if (!configuredProvider()) {
    return { error: friendlyAiMessage(new AiError("not_configured", "")) };
  }
  const blocked = await aiAllowanceError(ctx.db, ctx.userId);
  if (blocked) return { error: blocked };

  let result: AiResult;
  try {
    result = await generateJson(
      buildDraftRequest({
        brief: ctx.brief,
        strategy: ctx.strategy,
        previous: ctx.draft,
        note: "",
        format: ctx.draft.format,
        facts: ctx.facts,
        critique: ctx.critique,
      }),
    );
  } catch (error) {
    console.error(
      "AI call failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    await recordUsage(ctx, "draft_revision", null);
    return { error: friendlyAiMessage(error) };
  }
  await recordUsage(ctx, "draft_revision", result);

  const json = extractJson(result.text);
  const draft = parseDraft(json, ctx.draft.format);
  if (!draft) {
    console.error(
      "Revision not usable:",
      JSON.stringify({ model: result.model, ...describeAiText(result.text, json) }),
    );
    return { error: friendlyAiMessage(new AiError("bad_response", "")) };
  }

  const { error: insertError } = await ctx.db.from("drafts").insert({
    project_id: ctx.projectId,
    user_id: ctx.userId,
    strategy_id: ctx.strategyId,
    version: ctx.draftVersion + 1,
    draft_data: draft,
    owner_note: null,
    kind: "revision",
    prompt_version: DRAFT_PROMPT_VERSION,
    model_id: result.model,
  });
  if (insertError) {
    console.error("Saving revision failed:", insertError.message);
    return { error: "We could not save the new version. Please try again." };
  }

  revalidatePath(`/projects/${ctx.projectId}`);
  return { error: null };
}

export async function saveFactsAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!UUID.test(projectId)) {
    return { error: "We could not find that project." };
  }
  const facts = String(formData.get("facts") ?? "")
    .trim()
    .slice(0, 3000);

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return { error: "Please sign in again." };
  }

  const { error } = await db
    .from("projects")
    .update({ extra_facts: facts || null })
    .eq("id", projectId);
  if (error) {
    console.error("Saving facts failed:", error.message);
    return { error: DB_UPDATE_MESSAGE };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}
