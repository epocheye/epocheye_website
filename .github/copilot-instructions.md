# Project Guidelines

## Code Style

- Frontend code uses JavaScript and JSX (`.js`/`.jsx`), not TSX.
- Backend code in `backend/` uses TypeScript.
- Use the `@/*` path alias from `jsconfig.json` for app imports.
- Tailwind CSS v4 is configured via CSS variables in `app/globals.css`; do not add a `tailwind.config.js` unless explicitly required.
- React Compiler is enabled in `next.config.mjs`; avoid adding manual `useMemo`/`useCallback` unless profiling shows a real need.

## Architecture

- `app/page.js` is the client landing page entry and lazy-loads below-the-fold sections from `components/sections/` via `dynamic()` + `Suspense`.
- Keep marketing sections as standalone components in `components/sections/`.
- Creator app routes live under `app/creators/` with nested dashboard pages.
- Backend follows route -> middleware -> service layering under `backend/src/`; keep business logic in `backend/src/services/`, not route files.

## Build And Validate

- Frontend (repo root): `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run seed:crowd`.
- Backend (`backend/`): `npm run dev`, `npm run build`, `npm run start`, `npm run typecheck`, `npm run deploy`, `npm run deploy:prod`.
- There is no dedicated automated test suite yet; run frontend lint and backend typecheck as the default validation baseline.

## Project Conventions

- For full project context, design language, and integration details, read `CLAUDE.md` first.
- For UI/UX design tasks, follow `.github/agents/ui designer.agent.md`.
- Environment setup is split across `.env.example` (frontend) and `backend/.env.example` (backend).
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` must point to compatible backend hosts or notification features will fail.
- Backend health endpoint is `/api/health`; auth routes are intentionally rate-limited more strictly than general routes.
