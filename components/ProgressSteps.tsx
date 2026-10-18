export type ProgressStep = { label: string; done: boolean; hint: string };

// Shows where a project is: finished steps are ticked, the next one is ringed.
export default function ProgressSteps({ steps }: { steps: ProgressStep[] }) {
  const currentIndex = steps.findIndex((step) => !step.done);
  const next = currentIndex === -1 ? null : steps[currentIndex];

  return (
    <div className="progress-wrap">
      <ol className="progress" aria-label="Project progress">
        {steps.map((step, index) => {
          const state = step.done
            ? "done"
            : index === currentIndex
              ? "current"
              : "todo";
          return (
            <li
              key={step.label}
              className={`progress-step progress-${state}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="progress-dot" aria-hidden="true">
                {step.done ? "✓" : index + 1}
              </span>
              <span className="progress-label">
                {step.label}
                <span className="sr-only">
                  {step.done ? " (done)" : state === "current" ? " (next)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="progress-hint small">
        {next ? (
          <>
            <strong>Next:</strong> {next.hint}
          </>
        ) : (
          <>
            <strong>All done.</strong> Your final copy is ready to copy or
            download.
          </>
        )}
      </p>
    </div>
  );
}
