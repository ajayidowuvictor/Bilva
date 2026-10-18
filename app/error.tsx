"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <div className="container stack" style={{ maxWidth: 440 }}>
        <h1>Something went wrong</h1>
        <p className="muted">
          Bilva hit a problem loading this page. Your work is saved. Please try
          again.
        </p>
        <div className="row-buttons">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/projects" className="btn btn-ghost">
            Your projects
          </Link>
        </div>
      </div>
    </main>
  );
}
