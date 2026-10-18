import { AiError, type AiRequest, type AiResult } from "./types";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
};

// Google Gemini over plain HTTPS. The free tier is enough for building and
// testing. Note: on the free tier Google may use content to improve its
// products, so do not send real customers' private details through it.
export async function callGemini(req: AiRequest): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiError("not_configured", "GEMINI_API_KEY is not set.");
  }
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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
        signal: AbortSignal.timeout(50_000),
      },
    );
  } catch {
    throw new AiError("provider_error", "Could not reach the Gemini service.");
  }

  if (res.status === 429) {
    throw new AiError("rate_limited", "Gemini rate limit reached.");
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!res.ok || !data) {
    throw new AiError(
      "provider_error",
      data?.error?.message ?? `Gemini error (${res.status}).`,
    );
  }

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");
  if (!text.trim()) {
    throw new AiError("bad_response", "Gemini returned an empty answer.");
  }

  return {
    text,
    provider: "gemini",
    model,
    inputTokens: data.usageMetadata?.promptTokenCount ?? null,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
  };
}
