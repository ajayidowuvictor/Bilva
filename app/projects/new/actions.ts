"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NewProjectState = { error: string | null };

export async function createProject(
  _previous: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  const idea = String(formData.get("idea") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  let title = String(formData.get("title") ?? "").trim();

  if (idea.length < 10) {
    return {
      error: "Please describe your idea in at least a sentence or two.",
    };
  }
  if (idea.length > 4000) {
    return { error: "Your idea is too long. Please keep it under 4,000 characters." };
  }
  if (objective.length > 500) {
    return { error: "Your goal is too long. Please keep it under 500 characters." };
  }
  if (title.length > 120) {
    return { error: "The project name is too long. Please keep it under 120 characters." };
  }

  if (!title) {
    title = idea.length > 60 ? `${idea.slice(0, 57).trimEnd()}...` : idea;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title,
      original_idea: idea,
      objective: objective || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "We could not save your project. Please try again." };
  }

  redirect(`/projects/${data.id}`);
}
