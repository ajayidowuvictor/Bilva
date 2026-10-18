import type { ReactNode } from "react";
import { APPROACH_LABELS, type Strategy } from "@/lib/strategy";
import { ChooseStrategyForm } from "./strategy-forms";

export type StrategyCardData = {
  id: string;
  chosen: boolean;
  strategy: Strategy;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="stack">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function StrategyView({
  projectId,
  items,
  anyChosen,
}: {
  projectId: string;
  items: StrategyCardData[];
  anyChosen: boolean;
}) {
  return (
    <div className="stack-lg">
      {items.map(({ id, chosen, strategy }, index) => (
        <article
          key={id}
          className={chosen ? "strategy strategy-chosen" : "strategy"}
        >
          <div className="stack-lg">
            <div className="stack">
              <div className="row">
                <span className="chip chip-neutral">Angle {index + 1}</span>
                <span className="chip chip-info">
                  {APPROACH_LABELS[strategy.approach]}
                </span>
              </div>
              <h2>{strategy.name}</h2>
              <p>{strategy.big_idea}</p>
            </div>

            {strategy.example_line && (
              <blockquote className="direction">
                <p>{strategy.example_line}</p>
                <p className="muted small">
                  A line to show the direction, not final copy.
                </p>
              </blockquote>
            )}

            {strategy.why_it_fits && (
              <Section title="Why it fits">
                <p>{strategy.why_it_fits}</p>
              </Section>
            )}

            {strategy.built_on.length > 0 && (
              <Section title="Built on what you told Bilva">
                <ul className="list-plain">
                  {strategy.built_on.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {strategy.needs.length > 0 && (
              <Section title="Facts this angle still needs">
                <ul className="list-plain">
                  {strategy.needs.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </Section>
            )}

            {strategy.trade_off && (
              <Section title="The trade-off">
                <p>{strategy.trade_off}</p>
              </Section>
            )}

            {strategy.tone && (
              <p className="muted small">Tone: {strategy.tone}</p>
            )}

            <ChooseStrategyForm
              projectId={projectId}
              strategyId={id}
              chosen={chosen}
            />
            {!chosen && anyChosen && (
              <p className="muted small">
                Choosing this will replace your current choice.
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
