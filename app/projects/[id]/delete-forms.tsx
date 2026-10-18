"use client";

import { useActionState, useState } from "react";
import { deleteProjectAction, type DeleteActionState } from "./delete-actions";

const initialState: DeleteActionState = { error: null };

export function DeleteProjectForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    deleteProjectAction,
    initialState,
  );
  const [asking, setAsking] = useState(false);

  return (
    <section className="danger-zone stack">
      <h2>Delete this project</h2>
      <p className="muted small">
        This permanently removes the project and everything saved in it: the
        brief, angles, drafts, reviews and your final copy. It cannot be undone.
      </p>
      {state.error && <div className="alert alert-error">{state.error}</div>}

      {!asking ? (
        <div>
          <button
            type="button"
            className="btn btn-danger-outline btn-small"
            onClick={() => setAsking(true)}
          >
            Delete project
          </button>
        </div>
      ) : (
        <form action={action} className="row-buttons">
          <input type="hidden" name="projectId" value={projectId} />
          <button
            type="submit"
            className="btn btn-danger btn-small"
            disabled={pending}
          >
            {pending ? "Deleting..." : "Yes, delete it for good"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setAsking(false)}
            disabled={pending}
          >
            Keep it
          </button>
        </form>
      )}
    </section>
  );
}
