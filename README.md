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

Two environment variables connect the app to Supabase (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database

Run the files in `supabase/migrations/` in order in the Supabase SQL editor.

## Status

Skeleton: sign up and sign in, project list, new idea form, saved project page.
Next: guided brief, strategies, drafting, critique, editor, usage limits.
