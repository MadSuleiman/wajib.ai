# Repository Guidelines

## GitHub / Repo Context

- GitHub repo: `MadSuleiman/wajib.ai`
- Default branch: `main`
- Expected GitHub account for push/PR work: `MadSuleiman`
- Before push/PR work, run `gh auth status` and confirm `MadSuleiman` is active.
- If push or `gh repo view MadSuleiman/wajib.ai` fails with `Repository not found`, run `gh auth switch --hostname github.com --user MadSuleiman` and retry.
- Do not change remotes or configure SSH unless explicitly requested.

## Build, Test, and Development Commands

- Use Bun for project scripts; the lockfile is `bun.lock`.
- `bun dev` runs the Next.js development server.
- `bun run check` runs lint, type-check, production build, and formatting.
