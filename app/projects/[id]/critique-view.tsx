import {
  SCORE_KEYS,
  SCORE_LABELS,
  type Critique,
} from "@/lib/critique";

export default function CritiqueView({ critique }: { critique: Critique }) {
  return (
    <div className="stack-lg">
      <div className="row">
        <h3>Editor&apos;s verdict</h3>
        {critique.verdict === "ready" ? (
          <span className="chip chip-info">Ready to post</span>
        ) : (
          <span className="chip">Needs work</span>
        )}
      </div>

      <div className="scores">
        {SCORE_KEYS.map((key) => {
          const value = critique.scores[key];
          return (
            <div key={key} className="score-row">
              <span>{SCORE_LABELS[key]}</span>
              <span className="score-bar" aria-hidden="true">
                <span style={{ width: `${value * 20}%` }} />
              </span>
              <span className="small muted">{value} of 5</span>
            </div>
          );
        })}
      </div>

      {critique.invented_facts.length > 0 && (
        <div className="alert alert-error">
          <strong>Claims Bilva could not find in your facts:</strong>
          <ul className="list-plain">
            {critique.invented_facts.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {critique.strengths.length > 0 && (
        <div className="stack">
          <h3>What works</h3>
          <ul className="list-plain">
            {critique.strengths.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {critique.problems.length > 0 && (
        <div className="stack">
          <h3>What to fix</h3>
          <ul className="list-plain">
            {critique.problems.map((item, index) => (
              <li key={index}>
                {item.issue}
                {item.fix && (
                  <>
                    <br />
                    <span className="muted">Fix: {item.fix}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
