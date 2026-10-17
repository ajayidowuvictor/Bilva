"use client";

import { useActionState } from "react";
import { createProject, type NewProjectState } from "./actions";

const initialState: NewProjectState = { error: null };

export default function NewProjectForm() {
  const [state, formAction, pending] = useActionState(
    createProject,
    initialState,
  );

  return (
    <form action={formAction} className="card stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}

      <label className="field">
        <span className="label">Your idea</span>
        <textarea
          className="textarea"
          name="idea"
          required
          minLength={10}
          maxLength={4000}
          placeholder="Example: I sell land in Tanke, Ilorin. I want serious buyers to contact me, but every property advert online sounds the same."
        />
        <span className="hint">
          Say what you sell, who it is for and what is not working. Rough is
          fine.
        </span>
      </label>

      <label className="field">
        <span className="label">What do you want to happen? (optional)</span>
        <input
          className="input"
          type="text"
          name="objective"
          maxLength={500}
          placeholder="Example: More qualified enquiries"
        />
      </label>

      <label className="field">
        <span className="label">Project name (optional)</span>
        <input
          className="input"
          type="text"
          name="title"
          maxLength={120}
          placeholder="We will name it from your idea if you leave this empty"
        />
      </label>

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Saving..." : "Save project"}
      </button>
    </form>
  );
}
