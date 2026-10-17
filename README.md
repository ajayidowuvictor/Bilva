# Bilva

Copywriting intelligence for businesses: turn a rough business idea into strategically developed, persuasive copy.

## Stack

- Next.js (App Router) and TypeScript
- Supabase for login and the Postgres database
- Hosting on Vercel

## Settings

Two environment variables connect the app to Supabase (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Database

Run the files in `supabase/migrations/` in order in the Supabase SQL editor.

## Status

Skeleton: sign up and sign in, project list, new idea form, saved project page.
Next: guided brief, strategies, drafting, critique, editor, usage limits.
