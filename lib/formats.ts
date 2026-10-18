// The kinds of copy Bilva can write. The format is stored with each draft, so
// no database change is needed to add or remove one.

export const COPY_FORMATS = [
  "social_post",
  "whatsapp",
  "listing",
  "email",
] as const;

export type CopyFormat = (typeof COPY_FORMATS)[number];

export const DEFAULT_FORMAT: CopyFormat = "social_post";

export type FormatInfo = {
  label: string;
  // Shown to the owner when choosing.
  blurb: string;
  // What the "headline" field is called for this kind of copy.
  headlineLabel: string;
  // Instructions for the writer.
  task: string;
  lengthRule: string;
  headlineGuide: string;
  bodyGuide: string;
  ctaGuide: string;
  // Word for the finished piece in screen text.
  noun: string;
};

export const FORMATS: Record<CopyFormat, FormatInfo> = {
  social_post: {
    label: "Social media post",
    blurb: "A short advert for Facebook, Instagram or similar.",
    headlineLabel: "Headline",
    task: "Write one short social media advert for the owner to post.",
    lengthRule:
      "Keep the body between 60 and 120 words, in short paragraphs separated by a blank line.",
    headlineGuide: "one line, under 15 words.",
    bodyGuide:
      "the advert text without the headline and without the call to action.",
    ctaGuide: "one short sentence.",
    noun: "advert",
  },
  whatsapp: {
    label: "WhatsApp message",
    blurb: "A short, friendly broadcast or status message.",
    headlineLabel: "Opening line",
    task: "Write one WhatsApp broadcast message for the owner to send to people who may be interested. It must read like a message from a person, not like an advert.",
    lengthRule:
      "Keep the body between 40 and 90 words, in very short paragraphs of one or two lines separated by a blank line. No hashtags.",
    headlineGuide:
      "the first line of the message, a hook under 12 words, written the way a person would start a message.",
    bodyGuide:
      "the rest of the message without the opening line and without the call to action. Conversational and direct.",
    ctaGuide:
      "one short sentence telling the reader to reply to the message or use the contact method the owner gave.",
    noun: "message",
  },
  listing: {
    label: "Listing",
    blurb: "A title and description for a marketplace or classifieds site.",
    headlineLabel: "Listing title",
    task: "Write one listing for an online marketplace or classifieds site.",
    lengthRule:
      "Keep the body between 80 and 160 words: one or two short paragraphs, then a line that says \"Key details:\" followed by up to six lines that each start with \"- \". The key details may contain only facts the owner stated, each on its own line.",
    headlineGuide:
      "the listing title, under 12 words, with the most searchable facts the owner stated.",
    bodyGuide:
      "the description and the key details, without the title and without the call to action.",
    ctaGuide: "one short sentence telling buyers how to make contact.",
    noun: "listing",
  },
  email: {
    label: "Email",
    blurb: "A subject line and a short email to send to a list or a lead.",
    headlineLabel: "Subject line",
    task: "Write one short marketing email for the owner to send.",
    lengthRule:
      "Keep the body between 90 and 160 words, in short paragraphs separated by a blank line. Start the body with a plain greeting such as \"Hello,\". Do not invent the sender's name: if the sign-off needs a name, write [NEED: your name] there.",
    headlineGuide:
      "the email subject line, under 9 words, honest and specific, with no clickbait.",
    bodyGuide:
      "the email text from the greeting to the sign-off, without the subject line and without the call to action.",
    ctaGuide: "one short sentence that asks for one clear action.",
    noun: "email",
  },
};

export function parseFormat(value: unknown): CopyFormat {
  const text = typeof value === "string" ? value.trim() : "";
  return (COPY_FORMATS as readonly string[]).includes(text)
    ? (text as CopyFormat)
    : DEFAULT_FORMAT;
}

// True only when the value is exactly one of the known formats.
export function isCopyFormat(value: unknown): value is CopyFormat {
  return (
    typeof value === "string" && (COPY_FORMATS as readonly string[]).includes(value)
  );
}
