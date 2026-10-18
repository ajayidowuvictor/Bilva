# Bilva

Copywriting intelligence for businesses: turn a rough business idea into strategically developed, persuasive copy.

## Stack

- Next.js (App Router) and TypeScript
- Supabase for login and the Postgres database
- Hosting on Vercel

## Brand

Measured from the official Bilva banner and flyer. Use these in all new screens.

| Role | Colour |
| --- | --- |
| Navy (headers, dark mode background) | `#01002A` |
| Pink (accent, large text, rings) | `#EB0B87` |
| Pink, deeper (buttons and small text, readable with white) | `#D40A7B` |
| Blue | `#1495D7` |
| Deep blue | `#1A56AD` |
| Logo gradient | pink to violet `#8C50A6` to blue |

Logo: a "1B" mark with a pink check tick. Files: `public/logo-mark.png`, `app/icon.png`.
A higher-resolution original logo (SVG or transparent PNG) should replace these when available.

## Settings

Set these in the hosting provider's environment settings (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` connect the app to Supabase.
- `AI_PROVIDER` is `gemini` (free tier, default) or `anthropic` (paid). The matching key must be set: `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`.
- `GEMINI_MODEL` and `ANTHROPIC_MODEL` are optional model overrides.
- `GEMINI_FALLBACK_MODELS` (optional, comma separated) lists the free Gemini models tried in turn when the first one is busy.
- `NEXT_PUBLIC_CONTACT_EMAIL` (optional) is shown on the Privacy Policy and Terms pages.
- `AI_DAILY_LIMIT` caps successful AI runs per person per 24 hours (default 10).

Free-tier note: on Gemini's free tier, Google may use content to improve its products. Use it for building and testing only. Before real customers use Bilva, switch to a paid provider (Claude, or paid Gemini).

## Database

Run the files in `supabase/migrations/` in order in the Supabase SQL editor:

1. `0001_init.sql`: profiles and projects.
2. `0002_briefs_usage.sql`: briefs and AI usage tracking.
3. `0003_strategies.sql`: the three angles Bilva proposes and the one the owner chooses.
4. `0004_drafts.sql`: every version of the written copy.
5. `0005_critique_facts.sql`: editor reviews, revision tracking, and facts added after approval.
6. `0006_final_draft.sql`: the version the owner marks as final.
7. `0007_delete_account.sql`: lets a person delete their own account and all their data.

## Status

- Phase 1 (done): sign up and sign in, project list, new idea form, saved project page.
- Phase 2: guided brief (build, answer questions, update, approve) with a daily AI limit.
- Phase 3: three strategic angles from the approved brief; the owner chooses one (or asks for three new ones).
- Phase 4: first draft (short social media advert) from the brief and chosen angle, with [NEED: ...] markers, a check for numbers the owner never gave, copy button and version history.
- Phase 5: editor review (scores, claims check, fixes), rewrite from the review (maximum 2 rounds), and a box to add missing facts after approval.
- Phase 6: edit the advert by hand (saved as a new version, no AI run), mark one version as final, download as a text file, and a tidier project page.
- Phase 7: four copy formats (social media post, WhatsApp message, listing, email). The format is chosen for the first draft and can be switched on any new version. No database change.
- Launch readiness (code done): Privacy Policy and Terms pages with a footer and sign-up consent line, delete a project, an Account page with data download and account deletion. Still to do outside the code: switch email confirmation back on (with custom SMTP), domain, paid hosting, paid AI provider, lawyer review of the legal pages.
- Next: the switch to a paid AI provider, plans and payments.
