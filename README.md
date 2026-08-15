# Focus Flow

Focus Flow is a personal Getting Things Done (GTD) productivity PWA for
capturing, clarifying, organizing, scheduling, and executing tasks, projects,
habits, and people follow-up.

The application is intentionally deterministic. Reviews, coaching, synthesis,
and knowledge-management work belong in external tools rather than inside the
app.

## Stack

- React and JSX with Vite
- Tailwind CSS
- Supabase Postgres, Auth, Storage, and Edge Functions
- Google OAuth, Calendar, and Gmail integrations
- Cloudflare Pages deployment through GitHub Actions

## Repository layout

- `src/` — frontend application, route pages, components, contexts, hooks, and API helpers
- `supabase/functions/` — authenticated Google integration functions
- `public/` — static assets and SPA routing configuration
- `.github/workflows/` — build and Cloudflare deployment workflow
- `PROJECT.md` — product direction, architecture, invariants, and source-of-truth hierarchy
- `AGENTS.md` — concise maintainer instructions
- `docs/MAINTAINER_HANDBOOK.md` — detailed operational and security review
- `CHANGELOG.md` — human-readable implementation history

Historical or reference-only files moved during cleanup are preserved outside
the repository in `Support Files/Temporary Archive - Review Before Deletion/`.
See `docs/temporary-archive-manifest.md` before deleting that archive.

## Local development

Environment values belong in the ignored `.env.local` file. Start from
`.env.example`, then fill in the Supabase publishable/anon key. The repository
does not contain real credentials, and none should be added to Git.

```text
Copy-Item .env.example .env.local
```

The optional `VITE_DEV_EMAIL` and `VITE_DEV_PASSWORD` values enable the
development-only auto-login path. Use a dedicated development account or leave
them blank and use the normal login page.

```text
npm install
npm run dev
```

Validation commands:

```text
npm run build
npm run lint
```

There is currently no automated test suite. The production build is the minimum
required check for maintenance work; run lint and a targeted browser check when
the change affects behavior.

## Git and deployment

GitHub `main` is the canonical release path because pushes trigger the
Cloudflare Pages deployment. The homelab bare repository is a backup remote;
it is not the deployment source.

For completed changes:

1. Update `CHANGELOG.md`.
2. Review the staged file list for secrets and unrelated files.
3. Commit intentionally.
4. Push the same commit to GitHub `origin/main` and the homelab `server-backup/main`.
5. Verify the local, GitHub, and server refs and report what was actually deployed.

## Current product boundary

Do not reintroduce in-app AI, Reviews, or a general Notes/knowledge-management
system without an explicit product decision. Read `PROJECT.md` and the
relevant code before changing behavior.
