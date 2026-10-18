"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { configuredProvider, friendlyAiMessage, generateJson } from "@/lib/ai";
import { AiError, type AiResult } from "@/lib/ai/types";
import { dailyLimit, windowStartIso } from "@/lib/usage";
import {
  BRIEF_PROMPT_VERSION,
  buildBriefRequest,
  extractJson,
  parseBrief,
  type Brief,
} from "@/lib/brief";

export type BriefActionState = { error: string | null };

type Db = Awaited<ReturnType<typeof createClient>>;

type ProjectRow = {
  id: string;
  original_idea: string;
  objective: string | null;
  status: string;
};

type BriefRow = {
  version: number;
  brief_data: unknown;
  approved_at: string | null;
};

type Context =
  | {
      ok: true;
      db: Db;
      userId: string;
      project: ProjectRow;
      latest: BriefRow | null;
    }
  | { ok: false; error: string };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DB_UPDATE_MESSAGE =
  "Bilva's database needs its Phase 2 update before briefs can be saved. Please tell the person who set up Bilva.";

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

  // Row-level security means this only returns the signed-in user's project.
  const { data: project } = await db
    .from("projects")
    .select("id, original_idea, objective, status")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: "We could not find that project." };
  }

  const { data: latest, error: briefError } = await db
    .from("briefs")
    .select("version, brief_data, approved_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (briefError) {
    return { ok: false, error: DB_UPDATE_MESSAGE };
  }

  return {
    ok: true,
    db,
    userId: user.id,
    project: project as ProjectRow,
    latest: (latest as BriefRow | null) ?? null,
  };
}

async function runBrief(
  ctx: { db: Db; userId: string; project: ProjectRow },
  previous: Brief | null,
  previousVersion: number,
  answers: string,
  operation: string,
): Promise<BriefActionState> {
  if (!configuredProvider()) {
    return { error: friendlyAiMessage(new AiError("not_configured", "")) };
  }

  // Daily limit, counted from the usage log.
  const { count, error: usageError } = await ctx.db
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("status", "success")
    .gte("created_at", windowStartIso());
  if (usageError) {
    return { error: DB_UPDATE_MESSAGE };
  }
  const limit = dailyLimit();
  if ((count ?? 0) >= limit) {
    return {
      error: `You have used your ${limit} AI runs for today. Please come back tomorrow.`,
    };
  }

  const request = buildBriefRequest({
    idea: ctx.project.original_idea,
    objective: ctx.project.objective,
    previous,
    answers,
  });

  let result: AiResult;
  try {
    result = await generateJson(request);
  } catch (error) {
    console.error(
      "AI call failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    await ctx.db.from("usage_events").insert({
      user_id: ctx.userId,
      project_id: ctx.project.id,
      operation,
      provider: configuredProvider() ?? "unknown",
      status: "error",
    });
    return { error: friendlyAiMessage(error) };
  }

  // The AI call cost money or quota, so record it before anything else.
  await ctx.db.from("usage_events").insert({
    user_id: ctx.userId,
    project_id: ctx.project.id,
    operation,
    provider: result.provider,
    model_id: result.model,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    status: "success",
  });

  const brief = parseBrief(extractJson(result.text));
  if (!brief) {
    return { error: friendlyAiMessage(new AiError("bad_response", "")) };
  }

  const { error: insertError } = await ctx.db.from("briefs").insert({
    project_id: ctx.project.id,
    user_id: ctx.userId,
    version: previousVersion + 1,
    brief_data: brief,
    owner_answers: answers || null,
    prompt_version: BRIEF_PROMPT_VERSION,
    model_id: result.model,
  });
  if (insertError) {
    console.error("Saving brief failed:", insertError.message);
    return { error: "We could not save the brief. Please try again." };
  }

  await ctx.db
    .from("projects")
    .update({ status: "briefing" })
    .eq("id", ctx.project.id);

  revalidatePath(`/projects/${ctx.project.id}`);
  return { error: null };
}

export async function generateBriefAction(
  _previous: BriefActionState,
  formData: FormData,
): Promise<BriefActionState> {
  const ctx = await loadContext(formData);
  if (!ctx.ok) return { error: ctx.error };
  if (ctx.latest) return { error: "This project already has a brief." };
  return runBrief(ctx, null, 0, "", "brief_build");
}

export async function reviseBriefAction(
  _previous: BriefActionState,
  formData: FormData,
): Promise<BriefActionState> {
  const ctx = await loadContext(formData);
  if (!ctx.ok) return { error: ctx.error };
  if (!ctx.latest) return { error: "Please build the brief first." };
  if (ctx.latest.approved_at) {
    return { error: "This brief is already approved." };
  }

  const previous = parseBrief(ctx.latest.brief_data);
  if (!previous) {
    return { error: "We could not read the saved brief. Please try again." };
  }

  const lines: string[] = [];
  previous.questions_for_owner.forEach((question, index) => {
    const answer = String(formData.get(`answer_${index}`) ?? "")
      .trim()
      .slice(0, 1000);
    if (answer) {
      lines.push(`Question: ${question}\nAnswer: ${answer}`);
    }
  });
  const extra = String(formData.get("extra") ?? "")
    .trim()
    .slice(0, 1500);
  if (extra) {
    lines.push(`Anything else the owner wants to add: ${extra}`);
  }
  if (lines.length === 0) {
    return { error: "Please answer at least one question, or add a note." };
  }

  return runBrief(
    ctx,
    previous,
    ctx.latest.version,
    lines.join("\n\n"),
    "brief_revise",
  );
}

export async function approveBriefAction(
  _previous: BriefActionState,
  formData: FormData,
): Promise<BriefActionState> {
  const ctx = await loadContext(formData);
  if (!ctx.ok) return { error: ctx.error };
  if (!ctx.latest) return { error: "There is no brief to approve yet." };
  if (ctx.latest.approved_at) {
    return { error: "This brief is already approved." };
  }

  const { error } = await ctx.db
    .from("briefs")
    .update({ approved_at: new Date().toISOString() })
    .eq("project_id", ctx.project.id)
    .eq("version", ctx.latest.version);
  if (error) {
    return { error: "We could not approve the brief. Please try again." };
  }

  await ctx.db
    .from("projects")
    .update({ status: "strategy" })
    .eq("id", ctx.project.id);

  revalidatePath(`/projects/${ctx.project.id}`);
  return { error: null };
}
