# Focus Flow Maintainer Instructions

Read `PROJECT.md` and the relevant code before making changes. `PROJECT.md` is
the product-direction and architecture reference; current code and verified
live behavior take precedence when facts conflict.

## Working rules

- Preserve existing user data and unrelated local work.
- Keep Supabase persistence in `src/lib/api/` when practical.
- Keep lifecycle status separate from calendar scheduling.
- Use local calendar dates for user-facing day logic.
- Preserve the established cascade order for destructive operations.
- Do not commit credentials, tokens, secrets, private source material, or runtime data.
- Do not reintroduce in-app AI, Reviews, or general Notes without an explicit product decision.

## Before committing

1. Update `CHANGELOG.md` with the user-facing change.
2. Review the exact staged file list.
3. Run `npm run build`; run `npm run lint` when relevant.
4. Check `git diff --check`.
5. Confirm no secrets or unrelated files are staged.

## Cross-machine synchronization

GitHub `origin/main` is the canonical release path and deploys to Cloudflare
Pages. The homelab `server-backup` remote is a backup mirror, not a deployment
source. For finished work, push the same intentional commit to both remotes and
verify that local `HEAD`, GitHub `main`, and server `main` are equal.

Do not force-push or rewrite history. Do not change either remote without an
explicit reason and a final ref-equality check.

## Relevant locations

- Product and architecture: `PROJECT.md`
- Detailed maintainer/security review: `docs/MAINTAINER_HANDBOOK.md`
- Change history: `CHANGELOG.md`
- Local Codex skill: `.agents/skills/refresh-challenges/SKILL.md`
- Temporary cleanup archive: `../Support Files/Temporary Archive - Review Before Deletion/`
