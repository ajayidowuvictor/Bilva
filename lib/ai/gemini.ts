import { AiError, type AiRequest, type AiResult } from "./types";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
};

const DEFAULT_MODEL = "gemini-3.8-flash";

// Other free-tier Flash models, tried in order when the first one is busy.
// Override with GEMINI_FALLBACK_MODELS (comma separated).
const DEFAULT_FALLBACKS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

const TOTAL_BUDGET_MS = 45_000;
const PER_ATTEMPT_MS = 25_000;

function candidateModels(): string[] {
  const first = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const fromEnv = process.env.GEMINI_FALLBACK_MODELS;
  const extra = fromEnv
    ? fromEnv
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean)
    : DEFAULT_FALLBACKS;
  return [first, ...extra.filter((model) => model !== first)];
}

// Another model can help when the first is overloaded, unavailable to this
// key, rate limited, unreachable, or returned nothing. A bad key or bad
// request (400, 401, 403) will not improve on another model.
function canTryNext(status: number): boolean {
  return (
    status === 0 ||
    status === 200 ||
    status === 404 ||
    status === 429 ||
    status >= 500
  );
}

type Attempt =
  | { ok: true; result: AiResult }
  | { ok: false; status: number; message: string };

async function attempt(
  model: string,
  apiKey: string,
  req: AiRequest,
  timeoutMs: number,
): Promise<Attempt> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.user }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            maxOutputTokens: req.maxOutputTokens ?? 4096,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch {
    return { ok: false, status: 0, message: "Could not reach the Gemini service." };
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!res.ok || !data) {
    return {
      ok: false,
      status: res.status,
      message: data?.error?.message ?? `Gemini error (${res.status}).`,
    };
  }

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");
  if (!text.trim()) {
    return { ok: false, status: 200, message: "Gemini returned an empty answer." };
  }

  return {
    ok: true,
    result: {
      text,
      provider: "gemini",
      model,
      inputTokens: data.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
    },
  };
}

// Google Gemini over plain HTTPS. The free tier is enough for building and
// testing. Note: on the free tier Google may use content to improve its
// products, so do not send real customers' private details through it.
export async function callGemini(req: AiRequest): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError("not_configured", "GEMINI_API_KEY is not set.");
  }

  const started = Date.now();
  let last: { status: number; message: string } = {
    status: 0,
    message: "No attempt was made.",
  };

  for (const model of candidateModels()) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 3_000) break;

    const outcome = await attempt(
      model,
      apiKey,
      req,
      Math.min(remaining, PER_ATTEMPT_MS),
    );
    if (outcome.ok) return outcome.result;

    last = outcome;
    if (!canTryNext(outcome.status)) break;
  }

  if (last.status === 429) {
    throw new AiError("rate_limited", last.message);
  }
  throw new AiError(
    "provider_error",
    `Gemini failed (${last.status}): ${last.message}`,
  );
}
