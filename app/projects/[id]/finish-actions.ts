"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkEditedDraft, readDraft } from "@/lib/draft";
import { UUID } from "./shared";

export type FinishActionState = { error: string | null };

const DB_UPDATE_MESSAGE =
  "Bilva's database needs its Phase 6 update first. Please tell the person who set up Bilva.";

export async function saveEditedDraftAction(
  _previous: FinishActionState,
  formData: FormData,
): Promise<FinishActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!UUID.test(projectId)) {
    return { error: "We could not find that project." };
  }

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return { error: "Please sign in again." };
  }

  const { data: latest } = await db
    .from("drafts")
    .select("version, strategy_id, draft_data")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) {
    return { error: "Please write the first draft first." };
  }

  const before = readDraft(latest.draft_data);
  const checked = checkEditedDraft({
    headline: String(formData.get("headline") ?? ""),
    body: String(formData.get("body") ?? ""),
    call_to_action: String(formData.get("call_to_action") ?? ""),
    format: before?.format,
  });
  if ("error" in checked) return { error: checked.error };

  if (
    before &&
    before.headline === checked.draft.headline &&
    before.body === checked.draft.body &&
    before.call_to_action === checked.draft.call_to_action
  ) {
    return { error: "You have not changed anything yet." };
  }

  const { error } = await db.from("drafts").insert({
    project_id: projectId,
    user_id: user.id,
    strategy_id: latest.strategy_id ?? null,
    version: (latest.version as number) + 1,
    draft_data: checked.draft,
    owner_note: null,
    kind: "owner",
    prompt_version: "owner-edit",
    model_id: null,
  });
  if (error) {
    console.error("Saving edited draft failed:", error.message);
    return { error: "We could not save your changes. Please try again." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}

// Marks one version as the final advert. An empty draftId reopens the project.
export async function setFinalAction(
  _previous: FinishActionState,
  formData: FormData,
): Promise<FinishActionState> {
  const projectId = String(formData.get("projectId") ?? "");
  const draftId = String(formData.get("draftId") ?? "");
  if (!UUID.test(projectId) || (draftId !== "" && !UUID.test(draftId))) {
    return { error: "We could not find that version." };
  }

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return { error: "Please sign in again." };
  }

  if (draftId) {
    // Row-level security means this only finds the signed-in user's drafts.
    const { data: draft } = await db
      .from("drafts")
      .select("id")
      .eq("id", draftId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!draft) {
      return { error: "We could not find that version." };
    }
  }

  const { error } = await db
    .from("projects")
    .update({
      final_draft_id: draftId || null,
      status: draftId ? "completed" : "drafting",
    })
    .eq("id", projectId);
  if (error) {
    console.error("Marking final failed:", error.message);
    return { error: DB_UPDATE_MESSAGE };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}
