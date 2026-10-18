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
- `AI_DAILY_LIMIT` caps successful AI runs per person per 24 hours (default 10).

Free-tier note: on Gemini's free tier, Google may use content to improve its products. Use it for building and testing only. Before real customers use Bilva, switch to a paid provider (Claude, or paid Gemini).

## Database

Run the files in `supabase/migrations/` in order in the Supabase SQL editor:

1. `0001_init.sql`: profiles and projects.
2. `0002_briefs_usage.sql`: briefs and AI usage tracking.

## Status

- Phase 1 (done): sign up and sign in, project list, new idea form, saved project page.
- Phase 2: guided brief (build, answer questions, update, approve) with a daily AI limit.
- Next: strategies, drafting, critique, editor, export.
