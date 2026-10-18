// Facts the privacy policy and terms state. Kept in one place so the pages stay
// accurate when the AI provider or contact address changes.

export const LEGAL_UPDATED = "18 October 2026";

// Shown on the legal pages when set (Settings: NEXT_PUBLIC_CONTACT_EMAIL).
export function contactEmail(): string | null {
  const value = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return value ? value : null;
}

export type AiDisclosure = {
  name: string;
  // True while the free tier is used, where the provider may reuse content.
  freeTier: boolean;
};

// Follows the same setting that decides which AI Bilva really uses.
export function aiDisclosure(): AiDisclosure {
  const wanted = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  if (wanted === "anthropic") {
    return { name: "Anthropic (Claude)", freeTier: false };
  }
  return { name: "Google (Gemini API)", freeTier: true };
}
