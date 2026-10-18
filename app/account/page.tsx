import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteAccountForm from "./delete-account-form";
import InstallApp from "@/components/InstallApp";

export const metadata: Metadata = { title: "Your account | Bilva" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="stack-lg">
      <div className="row">
        <h1>Your account</h1>
        <Link href="/projects" className="btn btn-ghost btn-small">
          Back to projects
        </Link>
      </div>

      <section className="card stack">
        <h2>Signed in as</h2>
        <p>{user?.email}</p>
      </section>

      <InstallApp />

      <section className="card stack">
        <h2>Download your data</h2>
        <p className="muted">
          Get a copy of all your projects, briefs, angles, drafts and reviews as
          one file.
        </p>
        <div>
          <a
            href="/account/export"
            download
            className="btn btn-ghost btn-small"
          >
            Download my data
          </a>
        </div>
      </section>

      <section className="card stack">
        <h2>Delete my account</h2>
        <p className="muted">
          This permanently deletes your account and every project, draft and
          review in it. It cannot be undone. You may want to download your data
          first.
        </p>
        <DeleteAccountForm />
      </section>

      <p className="muted small">
        Read our <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/terms">Terms of Use</Link>.
      </p>
    </div>
  );
}
