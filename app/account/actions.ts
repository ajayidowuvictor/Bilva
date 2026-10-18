"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountActionState = { error: string | null };

// Permanently deletes the signed-in person's account and everything in it.
// The word DELETE must be typed so it cannot happen by accident.
export async function deleteAccountAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const typed = String(formData.get("confirm") ?? "").trim();
  if (typed !== "DELETE") {
    return { error: "Type the word DELETE (capital letters) to confirm." };
  }

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return { error: "Please sign in again." };
  }

  const { error } = await db.rpc("delete_my_account");
  if (error) {
    const missing =
      error.code === "PGRST202" || /delete_my_account/i.test(error.message);
    return {
      error: missing
        ? "Bilva's database needs its account-deletion update first (migration 0007)."
        : "Bilva could not delete your account. Please try again.",
    };
  }

  // The login record is gone; clear this browser's session too.
  await db.auth.signOut();
  redirect("/?account=deleted");
}
