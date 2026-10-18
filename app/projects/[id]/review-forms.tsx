"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import {
  critiqueDraftAction,
  reviseDraftAction,
  saveFactsAction,
  type ReviewActionState,
} from "./review-actions";

const initialState: ReviewActionState = { error: null };

function Waiting() {
  return (
    <p className="muted small">
      This can take up to a minute. Please keep this page open.
    </p>
  );
}

export function CritiqueForm({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    critiqueDraftAction,
    initialState,
  );

  return (
    <form action={action} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="projectId" value={projectId} />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || disabled}
      >
        {pending ? "The editor is reading your draft..." : "Review my draft"}
      </button>
      {pending && <Waiting />}
    </form>
  );
}

export function ReviseForm({
  projectId,
  disabled,
  roundsLeft,
}: {
  projectId: string;
  disabled: boolean;
  roundsLeft: number;
}) {
  const [state, action, pending] = useActionState(
    reviseDraftAction,
    initialState,
  );

  return (
    <form action={action} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="projectId" value={projectId} />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || disabled}
      >
        {pending ? "Bilva is rewriting..." : "Rewrite it using this review"}
      </button>
      <p className="muted small">
        {roundsLeft} improvement {roundsLeft === 1 ? "round" : "rounds"} left.
        Each one uses one AI run.
      </p>
      {pending && <Waiting />}
    </form>
  );
}

export function FactsForm({
  projectId,
  current,
}: {
  projectId: string;
  current: string;
}) {
  const [state, action, pending] = useActionState(
    saveFactsAction,
    initialState,
  );

  // Send the form ourselves so the text stays in the box if saving fails.
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
        <span className="label">Your extra facts</span>
        <textarea
          className="textarea"
          name="facts"
          rows={5}
          maxLength={3000}
          defaultValue={current}
          placeholder="For example: The land has a C of O. The road to the plot is tarred. Power and water are available. Payment can be in two instalments."
        />
      </label>
      <button type="submit" className="btn btn-ghost" disabled={pending}>
        {pending ? "Saving..." : "Save these facts"}
      </button>
      {current && !pending && (
        <p className="muted small">
          Saved. Bilva uses these facts in every new version and review.
        </p>
      )}
    </form>
  );
}
