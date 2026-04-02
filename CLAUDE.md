# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run seed:crowd # Seed crowd data from CSV (node scripts/seedFromCsv.mjs)
```

## Tech Stack

- **Next.js 16** (App Router, React 19) — JSX, not TSX
- **Tailwind CSS v4** — configured via CSS custom properties in `app/globals.css`, no `tailwind.config.js`
- **shadcn/ui** (new-york style, RSC enabled) — components in `components/ui/`
- **Framer Motion** + **GSAP** — primary animation libraries; avoid bouncy springs, use custom easing
- **Three.js / @react-three/fiber** — 3D/WebGL components
- **Supabase** — database and auth
- **Path alias:** `@/*` maps to the project root

## Architecture

### App Router Structure

`app/page.js` is a `"use client"` marketing landing page that lazy-loads all sections below the hero via `dynamic()` + `Suspense`. Each section in `components/sections/` is a standalone component composed into the home page.

Routes: `/` (home), `/login` (auth). Error boundary at `app/global-error.jsx`.

### Key Directories

- `app/` — Next.js pages, layout, and global styles
- `components/sections/` — Full-page marketing sections (Hero, Navbar, Problem, SolutionSplit, etc.)
- `components/ui/` — shadcn/ui primitives
- `components/notifications/` — Real-time notification system (Context, Panel, Bell, Toast)
- `lib/` — `authService.js` (JWT auth), `notificationService.js` (WebSocket), `utils.js`

### Backend Integration

- External REST API: `NEXT_PUBLIC_API_URL` (hosted on Render)
- WebSocket: `NEXT_PUBLIC_WS_URL` for real-time notifications
- Supabase: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public); `SUPABASE_SERVICE_KEY` (server-only)
- JWT secret: `JWT_SECRET`

### Design System

The UI follows a dark, cinematic, editorial aesthetic. Key rules from `.github/agents/ui designer.agent.md`:

- **Colors:** Void black backgrounds (`#0a0a0a`, `#050505`), deep surface overlays, white typography with opacity variants. No bright fills on CTAs — use outlined pill-style buttons.
- **Typography:** Montserrat Alternates for display/caps, Instrument Serif for editorial, Geist Sans for body/UI. Use optical sizing and tracked caps for headings.
- **Animation:** Framer Motion with custom cubic-bezier easing. No bouncy spring animations. GSAP for scroll-driven or complex timeline sequences.
- **Layout:** Generous whitespace, asymmetric grids, luxury editorial feel.

When doing UI work, reference `.github/agents/ui designer.agent.md` for the full design system specification.

### Performance Notes

- React Compiler is enabled (`next.config.mjs`) — avoid manual `useMemo`/`useCallback` where unnecessary
- Images should use Next.js `<Image>` with AVIF/WebP (configured in `next.config.mjs`)
- All sections below the hero are dynamically imported to keep initial bundle small
