import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sends the signed-in person a copy of their own data as one JSON file.
// Row-level security means each query only returns that person's rows.
export async function GET() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return new NextResponse("Please sign in.", { status: 401 });
  }

  const tables = [
    "projects",
    "briefs",
    "strategies",
    "drafts",
    "critiques",
  ] as const;

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    email: user.email ?? null,
  };

  for (const table of tables) {
    const { data, error } = await db.from(table).select("*");
    // A table from a later update may not exist yet; leave it out.
    out[table] = error ? [] : (data ?? []);
  }

  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bilva-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
