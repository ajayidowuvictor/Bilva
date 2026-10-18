"use client";

import { useActionState } from "react";
import {
  chooseStrategyAction,
  generateStrategiesAction,
  type StrategyActionState,
} from "./strategy-actions";

const initialState: StrategyActionState = { error: null };

export function GenerateStrategiesForm({
  projectId,
  disabled,
  again,
}: {
  projectId: string;
  disabled: boolean;
  again?: boolean;
}) {
  const [state, action, pending] = useActionState(
    generateStrategiesAction,
    initialState,
  );

  return (
    <form action={action} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="projectId" value={projectId} />
      <button
        type="submit"
        className={again ? "btn btn-ghost" : "btn btn-primary"}
        disabled={pending || disabled}
      >
        {pending
          ? "Bilva is thinking up angles..."
          : again
            ? "Show me three different angles"
            : "Show me three angles"}
      </button>
      {pending && (
        <p className="muted small">
          This can take up to a minute. Please keep this page open.
        </p>
      )}
    </form>
  );
}

export function ChooseStrategyForm({
  projectId,
  strategyId,
  chosen,
}: {
  projectId: string;
  strategyId: string;
  chosen: boolean;
}) {
  const [state, action, pending] = useActionState(
    chooseStrategyAction,
    initialState,
  );

  if (chosen) {
    return <span className="chip chip-info">Your choice</span>;
  }

  return (
    <form action={action} className="stack">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="strategyId" value={strategyId} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Choose this angle"}
      </button>
    </form>
  );
}
