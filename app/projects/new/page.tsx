import Link from "next/link";
import NewProjectForm from "./new-project-form";

export default function NewProjectPage() {
  return (
    <div className="stack-lg">
      <div className="stack">
        <Link href="/projects" className="link-back">
          &larr; All projects
        </Link>
        <h1>New project</h1>
        <p className="muted">
          Tell Bilva about your business idea. You will review and correct what
          it understands before any copy is written.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
