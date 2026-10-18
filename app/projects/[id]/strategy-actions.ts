"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { configuredProvider, friendlyAiMessage, generateJson } from "@/lib/ai";
import { AiError, type AiResult } from "@/lib/ai/types";
import { dailyLimit, windowStartIso } from "@/lib/usage";
import { extractJson, parseBrief, type Brief } from "@/lib/brief";
import {
  STRATEGY_PROMPT_VERSION,
  buildStrategyRequest,
  parseStrategies,
  readStrategy,
  type Strategy,
} from "@/lib/strategy";

export type StrategyActionState = { error: string | null };

type Db = Awaited<ReturnType<typeof createClient>>;

type StrategyRow = {
  id: string;
  batch: number;
  position: number;
  strategy_data: unknown;
  chosen_at: string | null;
};

type Context =
  | {
      ok: true;
      db: Db;
      userId: string;
      projectId: string;
      briefVersion: number;
      brief: Brief;
      latestBatch: number;
      latestRows: StrategyRow[];
    }
  | { ok: false; error: string };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DB_UPDATE_MESSAGE =
  "Bilva's database needs its Phase 3 update before strategies can be saved. Please tell the person who set up Bilva.";

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
  const { data: project } = await db
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: "We could not find that project." };
  }

  const { data: latestBrief } = await db
    .from("briefs")
    .select("version, brief_data, approved_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestBrief || !latestBrief.approved_at) {
    return { ok: false, error: "Please approve the brief first." };
  }
  const brief = parseBrief(latestBrief.brief_data);
  if (!brief) {
    return {
      ok: false,
      error: "We could not read the saved brief. Please try again.",
    };
  }

  const { data: rows, error: strategyError } = await db
    .from("strategies")
    .select("id, batch, position, strategy_data, chosen_at")
    .eq("project_id", projectId)
    .order("batch", { ascending: false })
    .order("position", { ascending: true })
    .limit(3);
  if (strategyError) {
    return { ok: false, error: DB_UPDATE_MESSAGE };
  }

  const list = (rows as StrategyRow[] | null) ?? [];
  // Rows come newest batch first, so the first row's batch is the latest.
  const latestBatch = list.length > 0 ? list[0].batch : 0;

  return {
    ok: true,
    db,
    userId: user.id,
    projectId,
    briefVersion: latestBrief.version as number,
    brief,
    latestBatch,
    latestRows: list.filter((row) => row.batch === latestBatch),
  };
}

export async function generateStrategiesAction(
  _previous: StrategyActionState,
  formData: FormData,
): Promise<StrategyActionState> {
  const ctx = await loadContext(formData);
  if (!ctx.ok) return { error: ctx.error };

  if (ctx.latestRows.some((row) => row.chosen_at)) {
    return {
      error:
        "You have already chosen an angle. You can pick a different one from the three below.",
    };
  }

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
    return { error: "Bilva's database needs its Phase 2 update first." };
  }
  const limit = dailyLimit();
  if ((count ?? 0) >= limit) {
    return {
      error: `You have used your ${limit} AI runs for today. Please come back tomorrow.`,
    };
  }

  const previous: Strategy[] = ctx.latestRows
    .map((row) => readStrategy(row.strategy_data))
    .filter((item): item is Strategy => item !== null);

  const operation = ctx.latestBatch === 0 ? "strategy_build" : "strategy_retry";

  let result: AiResult;
  try {
    result = await generateJson(
      buildStrategyRequest({ brief: ctx.brief, previous }),
    );
  } catch (error) {
    console.error(
      "AI call failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    await ctx.db.from("usage_events").insert({
      user_id: ctx.userId,
      project_id: ctx.projectId,
      operation,
      provider: configuredProvider() ?? "unknown",
      status: "error",
    });
    return { error: friendlyAiMessage(error) };
  }

  // The AI call cost money or quota, so record it before anything else.
  await ctx.db.from("usage_events").insert({
    user_id: ctx.userId,
    project_id: ctx.projectId,
    operation,
    provider: result.provider,
    model_id: result.model,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    status: "success",
  });

  const strategies = parseStrategies(extractJson(result.text));
  if (!strategies) {
    return { error: friendlyAiMessage(new AiError("bad_response", "")) };
  }

  const batch = ctx.latestBatch + 1;
  const { error: insertError } = await ctx.db.from("strategies").insert(
    strategies.map((strategy, index) => ({
      project_id: ctx.projectId,
      user_id: ctx.userId,
      brief_version: ctx.briefVersion,
      batch,
      position: index + 1,
      strategy_data: strategy,
      prompt_version: STRATEGY_PROMPT_VERSION,
      model_id: result.model,
    })),
  );
  if (insertError) {
    console.error("Saving strategies failed:", insertError.message);
    return { error: "We could not save the angles. Please try again." };
  }

  revalidatePath(`/projects/${ctx.projectId}`);
  return { error: null };
}

export async function chooseStrategyAction(
  _previous: StrategyActionState,
  formData: FormData,
): Promise<StrategyActionState> {
  const ctx = await loadContext(formData);
  if (!ctx.ok) return { error: ctx.error };

  const strategyId = String(formData.get("strategyId") ?? "");
  if (!UUID.test(strategyId)) {
    return { error: "We could not find that angle." };
  }
  // Only the current set of three can be chosen.
  if (!ctx.latestRows.some((row) => row.id === strategyId)) {
    return { error: "That angle is no longer available. Please refresh." };
  }

  const cleared = await ctx.db
    .from("strategies")
    .update({ chosen_at: null })
    .eq("project_id", ctx.projectId)
    .not("chosen_at", "is", null);
  if (cleared.error) {
    return { error: "We could not save your choice. Please try again." };
  }

  const chosen = await ctx.db
    .from("strategies")
    .update({ chosen_at: new Date().toISOString() })
    .eq("id", strategyId)
    .eq("project_id", ctx.projectId);
  if (chosen.error) {
    return { error: "We could not save your choice. Please try again." };
  }

  await ctx.db
    .from("projects")
    .update({ status: "drafting" })
    .eq("id", ctx.projectId);

  revalidatePath(`/projects/${ctx.projectId}`);
  return { error: null };
}
