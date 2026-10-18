import { callAnthropic } from "./anthropic";
import { callGemini } from "./gemini";
import {
  AiError,
  type AiProviderName,
  type AiRequest,
  type AiResult,
} from "./types";

// Which provider Bilva uses is one setting: AI_PROVIDER = "gemini" (default,
// free tier) or "anthropic" (paid). The matching API key must also be set.
export function configuredProvider(): AiProviderName | null {
  const wanted = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  if (wanted === "anthropic") {
    return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  }
  if (wanted === "gemini") {
    return process.env.GEMINI_API_KEY ? "gemini" : null;
  }
  return null;
}

export async function generateJson(req: AiRequest): Promise<AiResult> {
  const provider = configuredProvider();
  if (!provider) {
    throw new AiError("not_configured", "AI is not connected yet.");
  }
  return provider === "anthropic" ? callAnthropic(req) : callGemini(req);
}

// Plain-language messages that are safe to show to a user.
export function friendlyAiMessage(error: unknown): string {
  if (error instanceof AiError) {
    switch (error.code) {
      case "not_configured":
        return "The AI is not connected yet. Please try again later.";
      case "rate_limited":
        return "The AI service is busy right now. Please wait a minute and try again.";
      case "bad_response":
        return "The AI gave an answer Bilva could not use. Please try again.";
      default:
        return "Bilva could not reach the AI service. Please try again in a moment.";
    }
  }
  return "Something went wrong. Please try again.";
}
