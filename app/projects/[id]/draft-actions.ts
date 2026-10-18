"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { configuredProvider, friendlyAiMessage, generateJson } from "@/lib/ai";
import { AiError, type AiResult } from "@/lib/ai/types";
import { dailyLimit, windowStartIso } from "@/lib/usage";
import { extractJson, parseBrief } from "@/lib/brief";
import { readStrategy } from "@/lib/strategy";
import {
  DRAFT_PROMPT_VERSION,
  buildDraftRequest,
  parseDraft,
  readDraft,
} from "@/lib/draft";

export type DraftActionState = { error: string | null };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DB_UPDATE_MESSAGE =
  "Bilva's database needs its Phase 4 update before drafts can be saved. Please tell the person who set up Bilva.";

export async function generateDraftAction(
  _previous: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!UUID.test(projectId)) {
    return { error: "We could not find that project." };
  }
  const note = String(formData.get("note") ?? "")
    .trim()
    .slice(0, 800);

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return { error: "Please sign in again." };
  }

  // Row-level security means these only return the signed-in user's rows.
  // select("*") so a missing newer column never hides the project.
  const { data: project } = await db
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { error: "We could not find that project." };
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
    return { error: "Please approve the brief first." };
  }
  const brief = parseBrief(briefRow.brief_data);
  if (!brief) {
    return { error: "We could not read the saved brief. Please try again." };
  }

  const { data: chosenRow, error: strategyError } = await db
    .from("strategies")
    .select("id, strategy_data")
    .eq("project_id", projectId)
    .not("chosen_at", "is", null)
    .limit(1)
    .maybeSingle();
  if (strategyError) {
    return {
      error: "Bilva's database needs its Phase 3 update first.",
    };
  }
  if (!chosenRow) {
    return { error: "Please choose an angle first." };
  }
  const strategy = readStrategy(chosenRow.strategy_data);
  if (!strategy) {
    return { error: "We could not read the chosen angle. Please try again." };
  }

  const { data: latestDraft, error: draftError } = await db
    .from("drafts")
    .select("version, draft_data")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (draftError) {
    return { error: DB_UPDATE_MESSAGE };
  }
  const previous = latestDraft ? readDraft(latestDraft.draft_data) : null;
  const previousVersion = latestDraft ? (latestDraft.version as number) : 0;

  if (!configuredProvider()) {
    return { error: friendlyAiMessage(new AiError("not_configured", "")) };
  }

  // Daily limit, counted from the usage log.
  const { count, error: usageError } = await db
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "success")
    .gte("created_at", windowStartIso());
  if (usageError) {
    return { error: "Bilva's database needs its Phase 2 update first." };
  }
  const limit = dailyLimit();
  if ((count ?? 0) >= limit) {
    return {
      error: `You have used your ${limit} AI runs for today. Please come back tomorrow.`,
    };
  }

  const operation = previousVersion === 0 ? "draft_build" : "draft_revise";

  let result: AiResult;
  try {
    result = await generateJson(
      buildDraftRequest({ brief, strategy, previous, note, facts }),
    );
  } catch (error) {
    console.error(
      "AI call failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    await db.from("usage_events").insert({
      user_id: user.id,
      project_id: projectId,
      operation,
      provider: configuredProvider() ?? "unknown",
      status: "error",
    });
    return { error: friendlyAiMessage(error) };
  }

  // The AI call cost money or quota, so record it before anything else.
  await db.from("usage_events").insert({
    user_id: user.id,
    project_id: projectId,
    operation,
    provider: result.provider,
    model_id: result.model,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    status: "success",
  });

  const parsedJson = extractJson(result.text);
  const draft = parseDraft(parsedJson);
  if (!draft) {
    // Shape only, never the owner's content, so the logs stay private.
    const trimmed = result.text.trim();
    console.error(
      "Draft not usable:",
      JSON.stringify({
        model: result.model,
        chars: trimmed.length,
        outputTokens: result.outputTokens,
        startsWithBrace: trimmed.startsWith("{"),
        endsWithBrace: trimmed.endsWith("}"),
        jsonParsed: parsedJson !== null,
        keys:
          typeof parsedJson === "object" && parsedJson !== null
            ? Object.keys(parsedJson as Record<string, unknown>).slice(0, 8)
            : [],
      }),
    );
    return { error: friendlyAiMessage(new AiError("bad_response", "")) };
  }

  const { error: insertError } = await db.from("drafts").insert({
    project_id: projectId,
    user_id: user.id,
    strategy_id: chosenRow.id,
    version: previousVersion + 1,
    draft_data: draft,
    owner_note: note || null,
    prompt_version: DRAFT_PROMPT_VERSION,
    model_id: result.model,
  });
  if (insertError) {
    console.error("Saving draft failed:", insertError.message);
    return { error: "We could not save the draft. Please try again." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}
