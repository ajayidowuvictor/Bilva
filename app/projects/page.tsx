import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { statusLabel } from "@/lib/config";
import InstallApp from "@/components/InstallApp";

type ProjectRow = {
  id: string;
  title: string;
  original_idea: string;
  status: string;
  created_at: string;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, original_idea, status, created_at")
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as ProjectRow[];

  return (
    <div className="stack-lg">
      <div className="row">
        <h1>Your projects</h1>
        <Link href="/projects/new" className="btn btn-primary">
          New project
        </Link>
      </div>

      <InstallApp compact />

      {error && (
        <div className="alert alert-error">
          We could not load your projects. If this keeps happening, the
          database setup may not have been run yet.
        </div>
      )}

      {!error && projects.length === 0 && (
        <div className="card empty">
          <h2>No projects yet</h2>
          <p>
            Start with a rough idea: what you sell and what you want customers
            to do. Bilva will take it from there.
          </p>
          <Link href="/projects/new" className="btn btn-primary">
            Start your first project
          </Link>
        </div>
      )}

      {projects.length > 0 && (
        <div className="stack">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card"
            >
              <div className="row">
                <div className="card-title">{project.title}</div>
                <span className="chip">{statusLabel(project.status)}</span>
              </div>
              <p className="muted clamp">{project.original_idea}</p>
              <p className="muted small" style={{ marginTop: 8 }}>
                {formatDate(project.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
