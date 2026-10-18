"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { generateDraftAction, type DraftActionState } from "./draft-actions";

const initialState: DraftActionState = { error: null };

export function GenerateDraftForm({
  projectId,
  disabled,
  hasDraft,
}: {
  projectId: string;
  disabled: boolean;
  hasDraft: boolean;
}) {
  const [state, action, pending] = useActionState(
    generateDraftAction,
    initialState,
  );

  // Send the form ourselves so a note stays in the box if something goes wrong.
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      action(formData);
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="projectId" value={projectId} />

      {hasDraft && (
        <label className="field">
          <span className="label">
            What should change? (optional, for example &ldquo;shorter&rdquo; or
            &ldquo;start with the price&rdquo;)
          </span>
          <textarea
            className="textarea textarea-short"
            name="note"
            rows={2}
            maxLength={800}
          />
        </label>
      )}

      <button
        type="submit"
        className={hasDraft ? "btn btn-ghost" : "btn btn-primary"}
        disabled={pending || disabled}
      >
        {pending
          ? "Bilva is writing..."
          : hasDraft
            ? "Write a new version"
            : "Write my first draft"}
      </button>
      {pending && (
        <p className="muted small">
          This can take up to a minute. Please keep this page open.
        </p>
      )}
    </form>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState("Copy the advert");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copied");
    } catch {
      setLabel("Could not copy. Select the text and copy it.");
    }
    setTimeout(() => setLabel("Copy the advert"), 2500);
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={copy}>
      {label}
    </button>
  );
}
