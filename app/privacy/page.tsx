import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";
import { LEGAL_UPDATED, aiDisclosure, contactEmail } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy | Bilva" };

// Read the AI provider at request time so this page matches what Bilva uses.
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const ai = aiDisclosure();
  const email = contactEmail();

  return (
    <LegalShell title="Privacy Policy" updated={LEGAL_UPDATED}>
      <p>
        This page explains what Bilva collects, why, who else handles it, and
        the choices you have. We have tried to write it in plain language.
      </p>

      <section className="stack">
        <h2>What Bilva collects</h2>
        <ul className="list-plain">
          <li>
            <strong>Your account:</strong> your email address and your
            password. The password is handled by our login provider and is
            stored in a protected form. We cannot read it.
          </li>
          <li>
            <strong>Your work:</strong> the ideas, goals and facts you type,
            and what Bilva produces from them, such as briefs, angles, drafts,
            reviews and your own edits.
          </li>
          <li>
            <strong>Usage records:</strong> each time an AI step runs, we
            record the type of step, the time, the AI model used and how much
            text it processed. We use this to apply daily limits and to
            control costs. It does not contain the text you wrote.
          </li>
          <li>
            <strong>A sign-in cookie:</strong> a small file that keeps you
            signed in. Bilva does not use advertising cookies or advertising
            trackers.
          </li>
        </ul>
      </section>

      <section className="stack">
        <h2>How we use it</h2>
        <p>
          We use your information to run Bilva for you: to sign you in, save
          your projects, write and review copy, apply fair-use limits and keep
          the service secure. We do not sell your information.
        </p>
      </section>

      <section className="stack">
        <h2>Who else handles it</h2>
        <ul className="list-plain">
          <li>
            <strong>Supabase</strong> provides our login and database, where
            your account and projects are stored.
          </li>
          <li>
            <strong>Vercel</strong> hosts the Bilva website.
          </li>
          <li>
            <strong>{ai.name}</strong> is the AI service. To write copy, the
            text of your idea, your brief, your facts and your drafts is sent
            to it.
          </li>
        </ul>
        {ai.freeTier && (
          <div className="alert alert-info">
            <strong>Important while Bilva is in early testing.</strong> Bilva
            currently uses the free tier of Google&apos;s Gemini API. On the
            free tier, Google may use the content it receives to improve its
            products. Until Bilva moves to a paid AI plan, please do not enter
            private or confidential information, or personal details about
            other people, into your projects.
          </div>
        )}
        {!ai.freeTier && (
          <p>
            What you write is processed by {ai.name} under its terms for API
            customers, only to produce your copy.
          </p>
        )}
        <p>
          These providers run servers that may be outside your country, so
          your information may be processed abroad.
        </p>
      </section>

      <section className="stack">
        <h2>How long we keep it, and deleting it</h2>
        <p>
          We keep your information until you delete it. You can delete a single
          project from its page. You can delete your whole account from the
          Account page, which removes your account, your projects and your
          usage records. Copies held in provider backups, if any, expire on the
          provider&apos;s own schedule.
        </p>
        <p>
          You can also download a copy of your projects from the Account page.
        </p>
      </section>

      <section className="stack">
        <h2>Your rights</h2>
        <p>
          You can ask to see, correct or delete your information, and you can
          do most of this yourself in Bilva. Where Nigerian data protection law
          (the Nigeria Data Protection Act 2023) applies, you also have the
          rights that law gives you.
        </p>
      </section>

      <section className="stack">
        <h2>Children</h2>
        <p>Bilva is for people aged 18 and over.</p>
      </section>

      <section className="stack">
        <h2>Changes</h2>
        <p>
          If this policy changes, we will update the date at the top of this
          page.
        </p>
      </section>

      {email && (
        <section className="stack">
          <h2>Contact</h2>
          <p>
            Questions about your information? Write to{" "}
            <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </section>
      )}
    </LegalShell>
  );
}
