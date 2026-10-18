"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import {
  approveBriefAction,
  generateBriefAction,
  reviseBriefAction,
  type BriefActionState,
} from "./actions";

const initialState: BriefActionState = { error: null };

export function BuildBriefForm({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    generateBriefAction,
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
        {pending ? "Bilva is reading your idea..." : "Build my brief"}
      </button>
      {pending && (
        <p className="muted small">
          This can take up to a minute. Please keep this page open.
        </p>
      )}
    </form>
  );
}

export function ReviseBriefForm({
  projectId,
  questions,
  disabled,
}: {
  projectId: string;
  questions: string[];
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    reviseBriefAction,
    initialState,
  );

  // Send the form ourselves so the answers stay in the boxes if something
  // goes wrong (React would otherwise clear the form after each submit).
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

      {questions.map((question, index) => (
        <label key={index} className="field">
          <span className="label">
            {index + 1}. {question}
          </span>
          <textarea
            className="textarea textarea-short"
            name={`answer_${index}`}
            rows={2}
            maxLength={1000}
          />
        </label>
      ))}

      <label className="field">
        <span className="label">Anything else Bilva should know? (optional)</span>
        <textarea
          className="textarea textarea-short"
          name="extra"
          rows={3}
          maxLength={1500}
        />
      </label>

      <button
        type="submit"
        className="btn btn-ghost"
        disabled={pending || disabled}
      >
        {pending ? "Updating your brief..." : "Update brief with my answers"}
      </button>
      {pending && (
        <p className="muted small">
          This can take up to a minute. Please keep this page open.
        </p>
      )}
    </form>
  );
}

export function ApproveBriefForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    approveBriefAction,
    initialState,
  );

  return (
    <form action={action} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="projectId" value={projectId} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Approving..." : "Approve this brief"}
      </button>
    </form>
  );
}
