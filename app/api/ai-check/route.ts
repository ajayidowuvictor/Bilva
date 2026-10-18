import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { configuredProvider } from "@/lib/ai";
import { callGemini } from "@/lib/ai/gemini";

// TEMPORARY diagnostic page. It asks Google which models this key can use and
// makes one tiny test call, then reports Google's real answer. It never shows
// the key. Delete this file once the AI connection is confirmed working.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ModelList = {
  models?: { name?: string; supportedGenerationMethods?: string[] }[];
  error?: { message?: string };
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const provider = configuredProvider();
  const report: Record<string, unknown> = {
    provider,
    keyPresent: Boolean(process.env.GEMINI_API_KEY),
    modelInUse: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  };

  if (provider === "gemini") {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
        {
          headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
          signal: AbortSignal.timeout(20_000),
        },
      );
      report.listStatus = res.status;
      const body = (await res.json().catch(() => null)) as ModelList | null;
      if (!res.ok) {
        report.listError = body?.error?.message?.slice(0, 300) ?? "no message";
      } else {
        report.usableFlashModels = (body?.models ?? [])
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => (m.name ?? "").replace("models/", ""))
          .filter((name) => name.includes("flash"))
          .slice(0, 40);
      }
    } catch (error) {
      report.listError =
        error instanceof Error
          ? `${error.name}: ${error.message}`.slice(0, 300)
          : "network error";
    }

    try {
      const result = await callGemini({
        system: "Reply with JSON only.",
        user: 'Return {"ok": true}',
        maxOutputTokens: 200,
      });
      report.testCall = "worked";
      report.testModelUsed = result.model;
      report.testAnswer = result.text.slice(0, 120);
    } catch (error) {
      report.testCall = "failed";
      report.testError =
        error instanceof Error ? error.message.slice(0, 300) : "unknown error";
    }
  }

  return NextResponse.json(report);
}
