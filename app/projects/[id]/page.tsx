import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { statusLabel } from "@/lib/config";
import { configuredProvider } from "@/lib/ai";
import { parseBrief } from "@/lib/brief";
import { dailyLimit, windowStartIso } from "@/lib/usage";
import { readStrategy } from "@/lib/strategy";
import BriefView from "./brief-view";
import {
  ApproveBriefForm,
  BuildBriefForm,
  ReviseBriefForm,
} from "./brief-forms";
import StrategyView, { type StrategyCardData } from "./strategy-view";
import { GenerateStrategiesForm } from "./strategy-forms";

// The AI can take a while to answer, so allow the page's actions up to a minute.
export const maxDuration = 60;

type ProjectRecord = {
  id: string;
  title: string;
  original_idea: string;
  objective: string | null;
  status: string;
  created_at: string;
};

type BriefRecord = {
  version: number;
  brief_data: unknown;
  approved_at: string | null;
};

type StrategyRecord = {
  id: string;
  batch: number;
  position: number;
  strategy_data: unknown;
  chosen_at: string | null;
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, title, original_idea, objective, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const project = data as ProjectRecord;
  const created = new Date(project.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { data: briefData, error: briefError } = await supabase
    .from("briefs")
    .select("version, brief_data, approved_at")
    .eq("project_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: usedCount, error: usageError } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "success")
    .gte("created_at", windowStartIso());

  const databaseNeedsUpdate = Boolean(briefError || usageError);
  const latest = (briefData as BriefRecord | null) ?? null;
  const brief = latest ? parseBrief(latest.brief_data) : null;
  const approved = Boolean(latest?.approved_at);

  // The newest set of three angles (rows come newest batch first).
  const { data: strategyData, error: strategyError } = await supabase
    .from("strategies")
    .select("id, batch, position, strategy_data, chosen_at")
    .eq("project_id", id)
    .order("batch", { ascending: false })
    .order("position", { ascending: true })
    .limit(3);

  const strategyRows = (strategyData as StrategyRecord[] | null) ?? [];
  const newestBatch = strategyRows.length > 0 ? strategyRows[0].batch : 0;
  const strategyItems: StrategyCardData[] = [];
  for (const row of strategyRows) {
    if (row.batch !== newestBatch) continue;
    const parsed = readStrategy(row.strategy_data);
    if (parsed) {
      strategyItems.push({
        id: row.id,
        chosen: Boolean(row.chosen_at),
        strategy: parsed,
      });
    }
  }
  const anyChosen = strategyItems.some((item) => item.chosen);
  const chosenItem = strategyItems.find((item) => item.chosen) ?? null;

  const limit = dailyLimit();
  const remaining = Math.max(limit - (usedCount ?? 0), 0);
  const aiReady = configuredProvider() !== null;
  const aiBlocked = !aiReady || remaining === 0;

  const hasCriticalGaps = Boolean(
    brief && brief.missing_facts.some((item) => item.critical),
  );

  return (
    <div className="stack-lg">
      <div className="stack">
        <Link href="/projects" className="link-back">
          &larr; All projects
        </Link>
        <div className="row">
          <h1>{project.title}</h1>
          <span className="chip">{statusLabel(project.status)}</span>
        </div>
        <p className="muted small">Saved {created}</p>
      </div>

      <section className="card stack">
        <h2>Your idea</h2>
        <p className="idea-text">{project.original_idea}</p>
        {project.objective && (
          <p>
            <strong>Goal:</strong> {project.objective}
          </p>
        )}
      </section>

      {databaseNeedsUpdate && (
        <div className="alert alert-info">
          Bilva&apos;s database needs its Phase 2 update before briefs can be
          built. Please tell the person who set up Bilva.
        </div>
      )}

      {!databaseNeedsUpdate && !latest && (
        <section className="card stack">
          <h2>Step 1: Build your brief</h2>
          <p className="muted">
            Bilva will read your idea and show what it knows, what it is
            assuming and which facts are missing. It will not invent facts.
          </p>
          {!aiReady && (
            <div className="alert alert-info">
              The AI is not connected yet, so briefs cannot be built for now.
            </div>
          )}
          {aiReady && remaining === 0 && (
            <div className="alert alert-info">
              You have used all {limit} AI runs for today. Please come back
              tomorrow.
            </div>
          )}
          <BuildBriefForm projectId={project.id} disabled={aiBlocked} />
          {aiReady && remaining > 0 && (
            <p className="muted small">
              {remaining} of {limit} AI runs left today.
            </p>
          )}
        </section>
      )}

      {!databaseNeedsUpdate && latest && !brief && (
        <div className="alert alert-error">
          We could not read the saved brief for this project.
        </div>
      )}

      {!databaseNeedsUpdate && latest && brief && !approved && (
        <>
          <section className="card stack">
            <div className="row">
              <h2>Your brief</h2>
              <span className="chip chip-neutral">Version {latest.version}</span>
            </div>
            <BriefView brief={brief} />
          </section>

          {brief.questions_for_owner.length > 0 && (
            <section className="card stack">
              <h2>Answer what you can</h2>
              <p className="muted">
                Short answers are fine. Leave a box empty if you do not know
                yet.
              </p>
              <ReviseBriefForm
                key={latest.version}
                projectId={project.id}
                questions={brief.questions_for_owner}
                disabled={aiBlocked}
              />
              {aiReady && (
                <p className="muted small">
                  {remaining} of {limit} AI runs left today.
                </p>
              )}
            </section>
          )}

          <section className="card stack">
            <h2>Happy with the brief?</h2>
            {hasCriticalGaps ? (
              <p className="muted">
                Some critical facts are still missing. You can approve now, but
                the copy will carry [NEED: ...] markers where those facts must
                go.
              </p>
            ) : (
              <p className="muted">
                Approving locks this version. The copy will be built from it.
              </p>
            )}
            <ApproveBriefForm projectId={project.id} />
          </section>
        </>
      )}

      {!databaseNeedsUpdate && latest && brief && approved && (
        <>
          <section className="card">
            <details className="fold" open={strategyItems.length === 0}>
              <summary>
                Approved brief{" "}
                <span className="chip chip-info">Version {latest.version}</span>
              </summary>
              <BriefView brief={brief} />
            </details>
          </section>

          {strategyError && (
            <div className="alert alert-info">
              Bilva&apos;s database needs its Phase 3 update before strategies
              can be built. Please tell the person who set up Bilva.
            </div>
          )}

          {!strategyError && strategyItems.length === 0 && (
            <section className="card stack">
              <h2>Step 2: See three angles</h2>
              <p className="muted">
                Bilva will propose three genuinely different ways to persuade
                your buyers, built only from your brief. You choose one before
                any copy is written.
              </p>
              {hasCriticalGaps && (
                <p className="muted">
                  Some critical facts are still missing, so angles that depend
                  on them will show [NEED: ...] markers instead of guesses.
                </p>
              )}
              {!aiReady && (
                <div className="alert alert-info">
                  The AI is not connected yet, so angles cannot be built for
                  now.
                </div>
              )}
              {aiReady && remaining === 0 && (
                <div className="alert alert-info">
                  You have used all {limit} AI runs for today. Please come back
                  tomorrow.
                </div>
              )}
              <GenerateStrategiesForm
                projectId={project.id}
                disabled={aiBlocked}
              />
              {aiReady && remaining > 0 && (
                <p className="muted small">
                  {remaining} of {limit} AI runs left today.
                </p>
              )}
            </section>
          )}

          {!strategyError && strategyItems.length > 0 && (
            <>
              <section className="card stack">
                <h2>
                  {anyChosen ? "Your angles" : "Step 2: Choose your angle"}
                </h2>
                <p className="muted">
                  {anyChosen
                    ? "You can still switch to a different angle below."
                    : "Read all three, then choose the one you want the copy built on."}
                </p>
              </section>

              <StrategyView
                projectId={project.id}
                items={strategyItems}
                anyChosen={anyChosen}
              />

              {!anyChosen && (
                <section className="card stack">
                  <h2>None of these feel right?</h2>
                  <p className="muted">
                    Bilva can try three new angles. This uses one AI run.
                  </p>
                  <GenerateStrategiesForm
                    projectId={project.id}
                    disabled={aiBlocked}
                    again
                  />
                  {aiReady && (
                    <p className="muted small">
                      {remaining} of {limit} AI runs left today.
                    </p>
                  )}
                </section>
              )}

              {chosenItem && (
                <section className="card stack">
                  <h2>What happens next</h2>
                  <p className="muted">
                    You chose &ldquo;{chosenItem.strategy.name}&rdquo;. The next
                    step is the first draft, written from your brief and this
                    angle. That step is being built next.
                  </p>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
