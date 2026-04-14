# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (root)

```bash
npm run dev        # Start Next.js dev server (port 3000)
npm run build      # Production build
npm run lint       # Run ESLint (must pass before committing)
npm run seed:crowd # Seed crowd data from CSV
```

### Backend (`/backend`)

```bash
cd backend
npm run dev        # Local Express server (port 3001, ts-node-dev with hot reload)
npm run typecheck  # TypeScript typecheck without emitting
npm run build      # Compile TS to dist/
npm run deploy     # Build + deploy to AWS Lambda (requires AWS credentials)
npm run deploy:prod  # Deploy to prod stage
```

### Full local dev

Run both concurrently: `npm run dev` (root) + `cd backend && npm run dev`.

## Tech Stack

**Frontend:**

- **Next.js 16** (App Router, React 19) — JSX only, not TSX
- **Tailwind CSS v4** — configured via `@theme` in `app/globals.css`; no `tailwind.config.js`
- **shadcn/ui** (new-york style) — components in `components/ui/`
- **Framer Motion** + **GSAP** — primary animation libraries
- **Three.js / @react-three/fiber** — 3D/WebGL components
- **Supabase** — database + auth; `@supabase/supabase-js`
- **Path alias:** `@/*` maps to project root

**Backend (`/backend`):**

- **TypeScript Express.js** wrapped with `serverless-http` for AWS Lambda
- **Serverless Framework v3** — `serverless.yml` deploys to Lambda + API Gateway (ap-south-1)
- **Zod** — request validation; **bcryptjs** — password hashing
- **Razorpay** — UPI payouts; **jsonwebtoken** — creator JWTs

## Architecture

### Frontend App Router

`app/page.js` is a `"use client"` marketing landing page that lazy-loads all sections below the hero via `dynamic()` + `Suspense`.

**Routes:**

- `/` — Marketing landing page (sections in `components/sections/`)
- `/login` — Main app auth
- `/creators` — Creator campaign landing + auth (`/creators/login`, `/creators/signup`)
- `/creators/dashboard/**` — Protected creator dashboard (overview, content, payouts, settings)
- `/r/[code]` — Referral click tracking route handler (records click, redirects to `/?ref=CODE`)

### Two Separate Auth Systems

**Main app auth** (`lib/authService.js`): localStorage keys `jwt_token`, `user_data`. Talks to external API at `NEXT_PUBLIC_API_URL`.

**Creator auth** (`lib/creatorAuthService.js`): localStorage keys `creator_jwt`, `creator_refresh_token`, `creator_data`. Talks to creator backend at `NEXT_PUBLIC_CREATOR_API_URL`. Separate JWT issuer (`epocheye-creators`), separate secrets. `creatorFetch()` auto-attaches Bearer token and retries on 401.

Dashboard pages in `app/creators/dashboard/` are protected by an `<AuthGuard>` in `app/creators/dashboard/layout.jsx` that checks `isCreatorAuthenticated()` on mount and redirects to `/creators/login` if unauthenticated.

### Creator Campaign Backend

Backend source layout under `backend/src/`: `routes/` (one file per resource), `middleware/` (auth, error), `services/` (business logic), `lib/` (Supabase client, Razorpay), `db/schema.sql`.

All routes mounted under `/api/creator/*` and `/api/admin/*`:

- `auth.ts` — POST signup/login/refresh (signup generates promo code: `NAME6 + 4 digits`)
- `profile.ts` — GET/PUT `/me`, PUT `/me/payment` (UPI), PUT `/me/password`
- `stats.ts` — GET overview + 30-day timeline (for `ReferralChart`)
- `promo.ts` — GET own code, POST click (public), POST redeem (webhook, `X-Webhook-Secret` header)
- `content.ts` — GET/POST/DELETE content submissions
- `payouts.ts` — GET balance + history, POST payout request (min $10, requires UPI ID)
- `admin.ts` — CRUD for creators/payouts/content, protected by `X-Admin-Key` header

Database tables (Supabase): `creators`, `promo_codes`, `referral_clicks`, `referral_conversions`, `content_submissions`, `payout_requests`. Schema at `backend/src/db/schema.sql`.

### Real-time Notifications

`components/notifications/NotificationContext.jsx` manages a WebSocket connection to `NEXT_PUBLIC_WS_URL`. Reconnects with exponential backoff (max 5 attempts). `NotificationBell` sits in `Navbar`. `NotificationToast` shows new notifications as they arrive.

### Key Constraints

- **`components/sections/Hero.jsx` must never be modified** — it is the design source of truth.
- React Compiler is enabled — avoid manual `useMemo`/`useCallback` where unnecessary. The compiler's lint rules (`react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/immutability`) are enforced as errors. Use `startTransition` when calling setState synchronously in `useEffect`. Never read or write `ref.current` during render.
- All sections below the hero are dynamically imported — keep it that way.
- Images must use Next.js `<Image>` (AVIF/WebP configured in `next.config.mjs`).

## Design System

The UI follows a dark, cinematic, editorial aesthetic. Full spec in `.github/agents/ui designer.agent.md`.

**Colors:** Void black backgrounds (`#080808`, `#0a0a0a`), white typography with opacity variants (`text-white/40`, `text-white/70`). No bright fills — use outlined pill-style buttons.

**Typography:** Montserrat Alternates (display/headings), Instrument Serif (editorial), Geist Sans (body/UI).

**Animation:** Framer Motion with custom cubic-bezier easing (`[0.22, 1, 0.36, 1]` is the standard). No bouncy springs. GSAP for scroll-driven or complex timeline sequences.

**Creator dashboard aesthetic:** `bg-[#080808]` page, `bg-[#0d0d0d]` cards, `border-white/5` borders, `text-white/40` muted labels, `text-white/10` input backgrounds. Same dark palette as the marketing site.

## Environment Variables

**Frontend (`.env.local`):**

```
NEXT_PUBLIC_API_URL          # Main app backend (Render)
NEXT_PUBLIC_WS_URL           # WebSocket server
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_CREATOR_API_URL  # Creator Lambda API Gateway URL
JWT_SECRET
SUPABASE_SERVICE_KEY
```

**Backend (`backend/.env`):**

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
CREATOR_JWT_SECRET
CREATOR_JWT_REFRESH_SECRET
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
WEBHOOK_SECRET               # Mobile app uses X-Webhook-Secret header on /promo/redeem
ADMIN_API_KEY                # X-Admin-Key header for /api/admin/* routes
CORS_ORIGIN                  # https://epocheye.app
```
