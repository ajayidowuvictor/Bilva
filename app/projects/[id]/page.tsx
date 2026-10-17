import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { statusLabel } from "@/lib/config";

type ProjectRecord = {
  id: string;
  title: string;
  original_idea: string;
  objective: string | null;
  status: string;
  created_at: string;
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

      <section className="card stack">
        <h2>What happens next</h2>
        <p className="muted">
          Your idea is saved. The next step Bilva will offer is the guided
          brief: what it knows, what it is assuming, and the facts it still
          needs from you. That step is being built now.
        </p>
      </section>
    </div>
  );
}
