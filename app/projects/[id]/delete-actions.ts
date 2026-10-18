"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UUID } from "./shared";

export type DeleteActionState = { error: string | null };

// Deletes one project and everything saved under it. The database's own
// rules make sure only the owner can do this.
export async function deleteProjectAction(
  _previous: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
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

  const { data, error } = await db
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { error: "Bilva could not delete this project. Please try again." };
  }
  if (!data || data.length === 0) {
    return { error: "This project was not found. It may already be deleted." };
  }

  redirect("/projects");
}
