import type { createClient } from "@/lib/supabase/server";
import { dailyLimit, windowStartIso } from "@/lib/usage";

export type Db = Awaited<ReturnType<typeof createClient>>;

export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns a message to show the person if they cannot make another AI run
// today, or null if they can.
export async function aiAllowanceError(
  db: Db,
  userId: string,
): Promise<string | null> {
  const { count, error } = await db
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", windowStartIso());
  if (error) {
    return "Bilva's database needs its Phase 2 update first.";
  }
  const limit = dailyLimit();
  if ((count ?? 0) >= limit) {
    return `You have used your ${limit} AI runs for today. Please come back tomorrow.`;
  }
  return null;
}

// Shape only, never the owner's content, so server logs stay private.
export function describeAiText(
  text: string,
  parsed: unknown,
): Record<string, unknown> {
  const trimmed = text.trim();
  return {
    chars: trimmed.length,
    startsWithBrace: trimmed.startsWith("{"),
    endsWithBrace: trimmed.endsWith("}"),
    jsonParsed: parsed !== null,
    keys:
      typeof parsed === "object" && parsed !== null
        ? Object.keys(parsed as Record<string, unknown>).slice(0, 8)
        : [],
  };
}
