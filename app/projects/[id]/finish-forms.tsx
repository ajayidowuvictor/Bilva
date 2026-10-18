"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import {
  saveEditedDraftAction,
  setFinalAction,
  type FinishActionState,
} from "./finish-actions";
import type { Draft } from "@/lib/draft";
import { FORMATS } from "@/lib/formats";

const initialState: FinishActionState = { error: null };

export function EditDraftForm({
  projectId,
  draft,
}: {
  projectId: string;
  draft: Draft;
}) {
  const [state, action, pending] = useActionState(
    saveEditedDraftAction,
    initialState,
  );

  // Send the form ourselves so your edits stay in the boxes if saving fails.
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

      <label className="field">
        <span className="label">{FORMATS[draft.format].headlineLabel}</span>
        <input
          className="input"
          name="headline"
          maxLength={160}
          defaultValue={draft.headline}
        />
      </label>

      <label className="field">
        <span className="label">
          Body (leave a blank line between paragraphs)
        </span>
        <textarea
          className="textarea"
          name="body"
          rows={10}
          maxLength={2500}
          defaultValue={draft.body}
        />
      </label>

      <label className="field">
        <span className="label">Call to action</span>
        <input
          className="input"
          name="call_to_action"
          maxLength={300}
          defaultValue={draft.call_to_action}
        />
      </label>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Save as a new version"}
      </button>
      <p className="muted small">
        This saves your wording as a new version. It does not use an AI run.
        Bilva will check it again for leftover [NEED: ...] markers and numbers
        you never gave.
      </p>
    </form>
  );
}

export function FinalButton({
  projectId,
  draftId,
  isFinal,
}: {
  projectId: string;
  draftId: string;
  isFinal: boolean;
}) {
  const [state, action, pending] = useActionState(
    setFinalAction,
    initialState,
  );

  return (
    <form action={action} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="projectId" value={projectId} />
      <input
        type="hidden"
        name="draftId"
        value={isFinal ? "" : draftId}
      />
      <button
        type="submit"
        className={isFinal ? "btn btn-ghost" : "btn btn-primary"}
        disabled={pending}
      >
        {pending
          ? "Saving..."
          : isFinal
            ? "Reopen (this is no longer final)"
            : "Mark this version as final"}
      </button>
    </form>
  );
}

export function DownloadButton({
  text,
  fileName,
}: {
  text: string;
  fileName: string;
}) {
  const [label, setLabel] = useState("Download as a text file");

  function download() {
    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setLabel("Downloaded");
    } catch {
      setLabel("Could not download. Use the copy button instead.");
    }
    setTimeout(() => setLabel("Download as a text file"), 2500);
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={download}>
      {label}
    </button>
  );
}
