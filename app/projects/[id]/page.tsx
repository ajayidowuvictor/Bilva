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
import { draftAsText, exportFileName, readDraft, type Draft } from "@/lib/draft";
import DraftView from "./draft-view";
import { GenerateDraftForm } from "./draft-forms";
import { MAX_REVISIONS, readCritique, type Critique } from "@/lib/critique";
import CritiqueView from "./critique-view";
import { CritiqueForm, FactsForm, ReviseForm } from "./review-forms";
import { DownloadButton, EditDraftForm, FinalButton } from "./finish-forms";

// The AI can take a while to answer, so allow the page's actions up to a minute.
export const maxDuration = 60;

type ProjectRecord = {
  id: string;
  title: string;
  original_idea: string;
  objective: string | null;
  status: string;
  created_at: string;
  // Only present once the Phase 5 database update has been run.
  extra_facts?: string | null;
  // Only present once the Phase 6 database update has been run.
  final_draft_id?: string | null;
};

type BriefRecord = {
  version: number;
  brief_data: unknown;
  approved_at: string | null;
};

type DraftRecord = {
  id: string;
  version: number;
  strategy_id: string | null;
  draft_data: unknown;
  owner_note: string | null;
  // Only present once the Phase 5 database update has been run.
  kind?: string | null;
};

type CritiqueRecord = {
  id: string;
  draft_id: string;
  critique_data: unknown;
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
  // select("*") so the page keeps working before newer columns exist.
  const { data } = await supabase
    .from("projects")
    .select("*")
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

  // Every written version of the copy, newest first.
  const { data: draftData, error: draftError } = await supabase
    .from("drafts")
    .select("*")
    .eq("project_id", id)
    .order("version", { ascending: false });

  const draftRows = (draftData as DraftRecord[] | null) ?? [];
  const drafts = draftRows
    .map((row) => ({ row, draft: readDraft(row.draft_data) }))
    .filter((item): item is { row: DraftRecord; draft: Draft } => item.draft !== null);
  const latestDraft = drafts.length > 0 ? drafts[0] : null;
  const olderDrafts = drafts.slice(1);
  const draftIsForOtherAngle = Boolean(
    latestDraft &&
      chosenItem &&
      latestDraft.row.strategy_id !== chosenItem.id,
  );
  const extraFacts = project.extra_facts ?? "";
  const finalDraftId = project.final_draft_id ?? null;
  const finalEntry =
    finalDraftId !== null
      ? (drafts.find((item) => item.row.id === finalDraftId) ?? null)
      : null;
  const fileName = exportFileName(project.title);
  const revisionsUsed = draftRows.filter((row) => row.kind === "revision").length;
  const roundsLeft = Math.max(MAX_REVISIONS - revisionsUsed, 0);

  // The editor's review of each draft version (none before Phase 5's update).
  const { data: critiqueData, error: critiqueError } = await supabase
    .from("critiques")
    .select("id, draft_id, critique_data")
    .eq("project_id", id);
  const critiqueByDraft = new Map<string, Critique>();
  for (const row of (critiqueData as CritiqueRecord[] | null) ?? []) {
    const parsed = readCritique(row.critique_data);
    if (parsed) critiqueByDraft.set(row.draft_id, parsed);
  }
  const latestCritique = latestDraft
    ? (critiqueByDraft.get(latestDraft.row.id) ?? null)
    : null;

  // Everything the owner said, used to flag numbers Bilva should not have added.
  const ownerText = [
    project.original_idea,
    project.objective ?? "",
    extraFacts,
    brief ? JSON.stringify(brief) : "",
  ].join(" ");

  const limit = dailyLimit();
  const remaining = Math.max(limit - (usedCount ?? 0), 0);
  const aiReady = configuredProvider() !== null;
  const aiBlocked = !aiReady || remaining === 0;

  const hasCriticalGaps = Boolean(
    brief && brief.missing_facts.some((item) => item.critical),
  );

  // Lets the owner fill gaps after approving the brief, without a new brief.
  const factsCard = (
    <section className="card stack">
      <h2>Add facts Bilva is missing</h2>
      <p className="muted">
        Optional. Anything you know about the gaps in your brief, such as the
        land title, roads, power, water, payment terms or a real customer
        comment. Bilva treats these as facts you stated and uses them in the
        next version, instead of leaving [NEED: ...] markers.
      </p>
      <FactsForm projectId={project.id} current={extraFacts} />
    </section>
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

      {finalEntry && (
        <section className="card stack">
          <div className="row">
            <h2>Your final advert</h2>
            <span className="chip chip-info">
              Version {finalEntry.row.version}
            </span>
          </div>
          <DraftView
            draft={finalEntry.draft}
            ownerText={ownerText}
            showCopy
          />
          <DownloadButton
            text={draftAsText(finalEntry.draft)}
            fileName={fileName}
          />
          <FinalButton
            projectId={project.id}
            draftId={finalEntry.row.id}
            isFinal
          />
        </section>
      )}

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
              {anyChosen && chosenItem ? (
                <section className="card">
                  <details className="fold">
                    <summary>
                      Your angle: &ldquo;{chosenItem.strategy.name}&rdquo;
                    </summary>
                    <div className="stack-lg">
                      <p className="muted">
                        These are the three angles Bilva proposed. You can
                        still switch to a different one.
                      </p>
                      <StrategyView
                        projectId={project.id}
                        items={strategyItems}
                        anyChosen={anyChosen}
                      />
                    </div>
                  </details>
                </section>
              ) : (
                <>
                  <section className="card stack">
                    <h2>Step 2: Choose your angle</h2>
                    <p className="muted">
                      Read all three, then choose the one you want the copy
                      built on.
                    </p>
                  </section>

                  <StrategyView
                    projectId={project.id}
                    items={strategyItems}
                    anyChosen={anyChosen}
                  />
                </>
              )}

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

              {chosenItem && draftError && (
                <div className="alert alert-info">
                  Bilva&apos;s database needs its Phase 4 update before drafts
                  can be written. Please tell the person who set up Bilva.
                </div>
              )}

              {chosenItem && !draftError && !latestDraft && factsCard}

              {chosenItem && !draftError && !latestDraft && (
                <section className="card stack">
                  <h2>Step 3: Write the first draft</h2>
                  <p className="muted">
                    You chose &ldquo;{chosenItem.strategy.name}&rdquo;. Bilva
                    will write a short social media advert from your brief and
                    this angle. Where it lacks a fact, it will leave a
                    [NEED: ...] marker instead of guessing.
                  </p>
                  {!aiReady && (
                    <div className="alert alert-info">
                      The AI is not connected yet, so drafts cannot be written
                      for now.
                    </div>
                  )}
                  {aiReady && remaining === 0 && (
                    <div className="alert alert-info">
                      You have used all {limit} AI runs for today. Please come
                      back tomorrow.
                    </div>
                  )}
                  <GenerateDraftForm
                    projectId={project.id}
                    disabled={aiBlocked}
                    hasDraft={false}
                  />
                  {aiReady && remaining > 0 && (
                    <p className="muted small">
                      {remaining} of {limit} AI runs left today.
                    </p>
                  )}
                </section>
              )}

              {chosenItem && !draftError && latestDraft && (
                <>
                  <section className="card stack">
                    <div className="row">
                      <h2>Your draft</h2>
                      <span className="chip chip-neutral">
                        Version {latestDraft.row.version}
                      </span>
                      {latestDraft.row.kind === "revision" && (
                        <span className="chip chip-info">
                          Improved after review
                        </span>
                      )}
                      {latestDraft.row.kind === "owner" && (
                        <span className="chip chip-info">Edited by you</span>
                      )}
                      {finalDraftId === latestDraft.row.id && (
                        <span className="chip chip-info">Final</span>
                      )}
                    </div>
                    {draftIsForOtherAngle && (
                      <div className="alert alert-info">
                        This draft was written for a different angle than the
                        one you have chosen now. Write a new version to use
                        your current angle.
                      </div>
                    )}
                    {latestDraft.row.owner_note && (
                      <p className="muted small">
                        Your note for this version: {latestDraft.row.owner_note}
                      </p>
                    )}
                    <DraftView
                      draft={latestDraft.draft}
                      ownerText={ownerText}
                      showCopy
                    />
                    <DownloadButton
                      text={draftAsText(latestDraft.draft)}
                      fileName={fileName}
                    />
                    {finalDraftId !== latestDraft.row.id && (
                      <FinalButton
                        projectId={project.id}
                        draftId={latestDraft.row.id}
                        isFinal={false}
                      />
                    )}
                  </section>

                  {critiqueError && (
                    <div className="alert alert-info">
                      Bilva&apos;s database needs its Phase 5 update before
                      drafts can be reviewed. Please tell the person who set up
                      Bilva.
                    </div>
                  )}

                  {!critiqueError && !latestCritique && (
                    <section className="card stack">
                      <h2>Step 4: Have an editor review it</h2>
                      <p className="muted">
                        Bilva will read this draft like a tough editor. It
                        checks every claim against your facts, scores the
                        advert, and tells you what to fix. It does not change
                        your draft.
                      </p>
                      <CritiqueForm
                        projectId={project.id}
                        disabled={aiBlocked}
                      />
                      {aiReady && (
                        <p className="muted small">
                          {remaining} of {limit} AI runs left today.
                        </p>
                      )}
                    </section>
                  )}

                  {!critiqueError && latestCritique && (
                    <section className="card stack">
                      <h2>Editor&apos;s review</h2>
                      <CritiqueView critique={latestCritique} />
                      {roundsLeft > 0 ? (
                        <ReviseForm
                          projectId={project.id}
                          disabled={aiBlocked}
                          roundsLeft={roundsLeft}
                        />
                      ) : (
                        <p className="muted">
                          Bilva has used both of its improvement rounds on this
                          advert. You can still write a new version with your
                          own note below.
                        </p>
                      )}
                    </section>
                  )}

                  <section className="card stack">
                    <h2>Want it different?</h2>
                    <p className="muted">
                      Bilva keeps every version. A new version uses one AI run.
                    </p>
                    <GenerateDraftForm
                      projectId={project.id}
                      disabled={aiBlocked}
                      hasDraft
                    />
                    {aiReady && (
                      <p className="muted small">
                        {remaining} of {limit} AI runs left today.
                      </p>
                    )}
                  </section>

                  <section className="card">
                    <details className="fold">
                      <summary>Edit it yourself</summary>
                      <EditDraftForm
                        key={latestDraft.row.version}
                        projectId={project.id}
                        draft={latestDraft.draft}
                      />
                    </details>
                  </section>

                  {olderDrafts.length > 0 && (
                    <section className="card">
                      <details className="fold">
                        <summary>
                          Earlier versions{" "}
                          <span className="chip chip-neutral">
                            {olderDrafts.length}
                          </span>
                        </summary>
                        <div className="stack-lg">
                          {olderDrafts.map(({ row, draft }) => (
                            <div key={row.id} className="stack">
                              <div className="row">
                                <span className="chip chip-neutral">
                                  Version {row.version}
                                </span>
                                {finalDraftId === row.id && (
                                  <span className="chip chip-info">Final</span>
                                )}
                              </div>
                              <DraftView
                                draft={draft}
                                ownerText={ownerText}
                                showCopy={false}
                              />
                              {finalDraftId !== row.id && (
                                <FinalButton
                                  projectId={project.id}
                                  draftId={row.id}
                                  isFinal={false}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </section>
                  )}

                  {factsCard}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
