export type AiProviderName = "gemini" | "anthropic";

export type AiRequest = {
  system: string;
  user: string;
  maxOutputTokens?: number;
};

export type AiResult = {
  text: string;
  provider: AiProviderName;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type AiErrorCode =
  | "not_configured"
  | "rate_limited"
  | "bad_response"
  | "provider_error";

export class AiError extends Error {
  code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}
