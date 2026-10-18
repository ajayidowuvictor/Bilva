import { AiError, type AiRequest, type AiResult } from "./types";

type AnthropicResponse = {
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

// Anthropic Claude over plain HTTPS. Paid; used once Bilva has clients.
export async function callAnthropic(req: AiRequest): Promise<AiResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiError("not_configured", "ANTHROPIC_API_KEY is not set.");
  }
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxOutputTokens ?? 4096,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      }),
      signal: AbortSignal.timeout(50_000),
    });
  } catch {
    throw new AiError("provider_error", "Could not reach the Claude service.");
  }

  if (res.status === 429) {
    throw new AiError("rate_limited", "Claude rate limit reached.");
  }

  const data = (await res.json().catch(() => null)) as AnthropicResponse | null;
  if (!res.ok || !data) {
    throw new AiError(
      "provider_error",
      data?.error?.message ?? `Claude error (${res.status}).`,
    );
  }

  const text = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  if (!text.trim()) {
    throw new AiError("bad_response", "Claude returned an empty answer.");
  }

  return {
    text,
    provider: "anthropic",
    model,
    inputTokens: data.usage?.input_tokens ?? null,
    outputTokens: data.usage?.output_tokens ?? null,
  };
}
