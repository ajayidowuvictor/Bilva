import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/components/LegalShell";
import { LEGAL_UPDATED, contactEmail } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Use | Bilva" };

export const dynamic = "force-dynamic";

export default function TermsPage() {
  const email = contactEmail();

  return (
    <LegalShell title="Terms of Use" updated={LEGAL_UPDATED}>
      <p>
        By creating an account or using Bilva, you agree to these terms and to
        our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <section className="stack">
        <h2>Using Bilva</h2>
        <p>
          You must be 18 or over. Keep your password private. You are
          responsible for what happens under your account.
        </p>
      </section>

      <section className="stack">
        <h2>What Bilva does, and what it cannot promise</h2>
        <p>
          Bilva uses AI to help you plan and write marketing copy. AI can make
          mistakes. Bilva checks its writing against the facts you give it and
          flags problems, but it cannot guarantee that the copy is accurate,
          legal or effective.
        </p>
        <p>
          <strong>You are responsible for checking every fact, price, number
          and claim before you publish anything.</strong> Do not publish a
          claim you cannot prove.
        </p>
      </section>

      <section className="stack">
        <h2>Your content</h2>
        <p>
          What you enter and the copy Bilva produces for you belong to you. You
          allow Bilva to process your content, including by sending it to the
          AI service described in the Privacy Policy, only to run the service
          for you.
        </p>
      </section>

      <section className="stack">
        <h2>Rules</h2>
        <p>Do not use Bilva to:</p>
        <ul className="list-plain">
          <li>
            write false or misleading adverts, fake reviews or testimonials, or
            scams;
          </li>
          <li>promote anything illegal;</li>
          <li>create hateful, abusive or harassing content;</li>
          <li>
            infringe other people&apos;s rights, or enter other people&apos;s
            personal information without a right to do so;
          </li>
          <li>
            attack, overload or misuse the service, or get around its limits.
          </li>
        </ul>
      </section>

      <section className="stack">
        <h2>Early access, limits and changes</h2>
        <p>
          Bilva is in early access. Daily limits apply to AI use. Features,
          limits and prices may change, and the service may sometimes be
          unavailable.
        </p>
      </section>

      <section className="stack">
        <h2>Ending your account</h2>
        <p>
          You can delete your account at any time from the Account page. We may
          suspend or close an account that breaks these terms.
        </p>
      </section>

      <section className="stack">
        <h2>Responsibility</h2>
        <p>
          Bilva is provided as it is. To the extent the law allows, we are not
          responsible for losses that result from copy you publish, such as lost
          sales, complaints or penalties.
        </p>
      </section>

      <section className="stack">
        <h2>Changes to these terms</h2>
        <p>
          If we change these terms, we will update the date at the top of this
          page. If you keep using Bilva after that, you accept the new terms.
        </p>
      </section>

      {email && (
        <section className="stack">
          <h2>Contact</h2>
          <p>
            Questions about these terms? Write to{" "}
            <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </section>
      )}
    </LegalShell>
  );
}
