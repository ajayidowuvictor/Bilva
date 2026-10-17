// True only when both Supabase settings are present. Used so the app can show a
// clear "not connected yet" message instead of crashing during first setup.
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  intake: "Idea saved",
  briefing: "Building brief",
  strategy: "Choosing strategy",
  drafting: "Drafting",
  review: "In review",
  completed: "Completed",
  archived: "Archived",
};

export function statusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status] ?? status;
}
