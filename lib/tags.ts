// Stops pasted or generated text from closing or faking the tags Bilva uses to
// separate information from instructions in its prompts.
const BILVA_TAGS =
  /<\/?(approved_brief|chosen_angle|previous_draft|owner_note|owner_added_facts|editor_critique|draft_to_review)>/gi;

export function cleanTags(text: string): string {
  return text.replace(BILVA_TAGS, "");
}
