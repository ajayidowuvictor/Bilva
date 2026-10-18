import type { ReactNode } from "react";
import Link from "next/link";
import Brand from "@/components/Brand";

// Header and page frame for the public legal pages.
export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Brand href="/" />
          <Link href="/login" className="btn btn-ghost btn-small">
            Sign in
          </Link>
        </div>
      </header>
      <main>
        <div className="container" style={{ maxWidth: 720 }}>
          <article className="card legal stack-lg">
            <div className="stack">
              <h1>{title}</h1>
              <p className="muted small">Last updated {updated}</p>
            </div>
            {children}
          </article>
        </div>
      </main>
    </>
  );
}
