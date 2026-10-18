import { BRIEF_FIELDS, type Brief, type BriefStatus } from "@/lib/brief";

function StatusChip({ status }: { status: BriefStatus }) {
  if (status === "stated") {
    return <span className="chip chip-info">From you</span>;
  }
  if (status === "assumed") {
    return <span className="chip chip-neutral">Assumed</span>;
  }
  return <span className="chip">Needed</span>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-plain">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="stack-lg">
      <div className="stack">
        {BRIEF_FIELDS.map(({ key, label }) => {
          const entry = brief[key];
          return (
            <div key={key} className="brief-field">
              <div className="row">
                <span className="label" style={{ marginBottom: 0 }}>
                  {label}
                </span>
                <StatusChip status={entry.status} />
              </div>
              <p className={entry.value ? "" : "muted"}>
                {entry.value || "Not provided yet."}
              </p>
            </div>
          );
        })}
      </div>

      {brief.known_facts.length > 0 && (
        <div className="stack">
          <h3>What you told Bilva</h3>
          <BulletList items={brief.known_facts} />
        </div>
      )}

      {brief.assumptions.length > 0 && (
        <div className="stack">
          <h3>What Bilva is assuming</h3>
          <p className="muted small">
            Correct anything here that is wrong. Bilva will not treat these as
            facts.
          </p>
          <BulletList items={brief.assumptions} />
        </div>
      )}

      {brief.missing_facts.length > 0 && (
        <div className="stack">
          <h3>Facts still missing</h3>
          <ul className="list-plain">
            {brief.missing_facts.map((item, index) => (
              <li key={index}>
                {item.fact}{" "}
                {item.critical && <span className="chip">Critical</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.constraints.length > 0 && (
        <div className="stack">
          <h3>Limits you set</h3>
          <BulletList items={brief.constraints} />
        </div>
      )}
    </div>
  );
}
