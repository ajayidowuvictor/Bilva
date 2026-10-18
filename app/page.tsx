import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/config";
import Brand from "@/components/Brand";
import { COPY_FORMATS, FORMATS } from "@/lib/formats";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account } = await searchParams;
  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect("/projects");
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Brand href="/" />
          {supabaseConfigured && (
            <Link href="/login" className="btn btn-ghost btn-small">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main>
        <div className="container stack-lg">
          {account === "deleted" && (
            <div className="alert alert-info">
              Your account and everything in it has been deleted.
            </div>
          )}
          {!supabaseConfigured && (
            <div className="alert alert-info">
              <strong>Bilva is online but not connected to its database yet.</strong>{" "}
              The two Supabase settings (NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing or empty in the hosting
              settings.
            </div>
          )}

          <section className="hero stack">
            <h1>
              Strategy before <span className="hl">writing.</span>
            </h1>
            <p>
              Bilva turns a rough business idea into persuasive copy. It asks
              the right questions first, tests three different arguments, then
              writes and critiques the draft before you see it.
            </p>
            {supabaseConfigured && (
              <div>
                <Link href="/login" className="btn btn-primary">
                  Get started
                </Link>
              </div>
            )}
          </section>

          <section className="card stack">
            <h2>How it works</h2>
            <ol className="steps">
              <li>
                <span className="num">1</span>
                <span>
                  <strong>Idea.</strong> Tell Bilva what you sell and what you
                  want to happen.
                </span>
              </li>
              <li>
                <span className="num">2</span>
                <span>
                  <strong>Brief.</strong> Bilva lists what it knows, what it is
                  assuming and what facts are missing.
                </span>
              </li>
              <li>
                <span className="num">3</span>
                <span>
                  <strong>Strategy.</strong> Pick one of three genuinely
                  different persuasive angles.
                </span>
              </li>
              <li>
                <span className="num">4</span>
                <span>
                  <strong>Draft and critique.</strong> The copy is written, then
                  challenged by a separate editor.
                </span>
              </li>
            </ol>
          </section>
          <section className="card stack">
            <h2>What Bilva can write</h2>
            <ul className="format-list">
              {COPY_FORMATS.map((key) => (
                <li key={key}>
                  <strong>{FORMATS[key].label}</strong>
                  <span className="muted">{FORMATS[key].blurb}</span>
                </li>
              ))}
            </ul>
          </section>

          {supabaseConfigured && (
            <section className="cta-band stack">
              <h2>Try it on your own idea</h2>
              <p>Free while Bilva is in early access. It takes a minute to start.</p>
              <div>
                <Link href="/login" className="btn btn-primary">
                  Get started
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
