"use client";

import { useActionState } from "react";
import { deleteAccountAction, type AccountActionState } from "./actions";

const initialState: AccountActionState = { error: null };

export default function DeleteAccountForm() {
  const [state, action, pending] = useActionState(
    deleteAccountAction,
    initialState,
  );

  return (
    <form action={action} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <label className="field">
        <span className="label">Type DELETE to confirm</span>
        <input
          className="input"
          name="confirm"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
      </label>
      <div>
        <button
          type="submit"
          className="btn btn-danger btn-small"
          disabled={pending}
        >
          {pending ? "Deleting..." : "Delete my account for good"}
        </button>
      </div>
    </form>
  );
}
