# Agency Desk

Personal agency workspace and AI assistant (Jarvis) for Matt. Full spec: `AGENCY_DESK_BRIEF.md`. Read it before writing code.

## How to work

Matt is very busy. These rules override anything older.

- Do everything yourself. Keep Matt's manual steps to the absolute minimum.
- Choose sensible defaults instead of asking questions. Ask only when a choice is costly or hard to undo.
- Work one phase at a time. At the end of each phase: build, deploy, run the remote migration, open a PR into `main`, and merge it yourself once the build passes. Matt reviews the live site, not the PR.
- After merging, give a short summary and the live URL, then wait for Matt's verdict on the live site before starting the next phase.
- If something is needed from Matt (a login, key or file), put ONE short checklist at the very end of the message with the exact clicks. Never spread steps through the message.
- Free tiers only. No paid plans or new subscriptions. The one exception is pay per use AI through OpenRouter, with a hard monthly cap (start at US$10).
- Known manual steps left for Matt: (1) Phase 3 needs his ad export CSVs, which he drops into the chat. (2) R2 needs a one time enable by the account owner in Cloudflare: Storage and databases, then R2, then enable. (3) Opening each live site and saying whether it is good.

## Desktop app (future phase, standing requirements)

- One Windows installer that Matt double clicks once. It sets up everything: the app, Whisper (speech to text), the wake word, and Kokoro (text to speech) started automatically in the background. After that the app updates itself.
- Jarvis voice ships with a ready tuned default preset that sounds good from day one. A tuning panel exists but Matt never has to use it.
- Stay on free tools. Build and release the installer from GitHub (Actions and Releases) so Matt has nothing to run.

## Secrets and config

- All API keys live in Worker secrets (`wrangler secret put`), server side only. Keep them out of the frontend, the repo and logs.
- All config (model list, routing rules, spend cap, news topics, cron times) lives in one file: `src/config.ts`.

## Stack

- Cloudflare Worker with Hono for the API and scheduled jobs.
- D1 for data, KV for cache and settings, R2 for uploaded files (added in Phase 3).
- React, Vite and TypeScript frontend, served as Worker static assets from the same Worker.
- Cloudflare Access (free) protects the whole app so only Matt's email can sign in.
- Later: an Expo phone app using the same API.
- Repo: `mattdav30/agency-desk`.

## Writing rules (all UI text and all AI generated copy)

- Plain, simple language.
- No em dashes or hyphens.
- Positive phrasing. Avoid "not", "isn't", "don't" style wording.
- No hashtags.
- Use only figures from real sources. Flag unclear figures for Matt to check. Sample data must be labelled as sample.

## Design

- Must look human made, in the style of Awwwards sites. Never a generic AI dashboard. No gradient washes, no emoji icons. Use inline stroke SVG icons.
- Dark mission control look. Background `#0E0F12`, panels `#16181D`, borders `#262A31`, row dividers `#23262C`.
- Text `#ECEDEF`, muted `#9BA1AB`, secondary `#C9CDD3`.
- Amber `#F2A93B` (primary actions, today's items), blue `#6EA8FE` (data, clients), green `#5FD08A` (connected, on).
- Fonts: Space Grotesk for headings, Inter for body, JetBrains Mono for small uppercase labels and numbers.
- Cards with 14px radius, pill shaped buttons and nav, touch targets at least 44px.
- Responsive. Works at phone width: cards stack, tables scroll sideways.

## Phases

0 Setup. 1 Home screen with sample data. 2 Clients, tasks and reports. 3 Ad spend (CSV upload, R2). 4 Jarvis and multi model AI through OpenRouter, spend cap, `ai_usage` logging. 5 News radar (weekday cron `50 20 * * 0-4` UTC). 6 Inbox (Gmail and Outlook, plan with Matt first). 7 Phone app.

Status: Phases 0, 1, 1.5, 2 and 3 done. Phase 3 (ad spend) awaits Matt's check on the live site. Next is Phase 4 (Jarvis and multi model AI), once Matt says Phase 3 is good.

## Commands

- `npm run build` typechecks and builds. `npm run deploy` builds and deploys.
- `npm run db:migrate:remote` applies D1 migrations to the live database.
- Ad spend is live: `src/shared/ads.ts` reads exports (UTF 16 and UTF 8 CSV, TSV, XLSX), guesses columns, detects LinkedIn and Meta, and splits ranges across months. API in `src/worker/ads.ts`. Raw files go to R2 (`FILES` binding, bucket `agency-desk-files`). Column mappings and account to client matches are remembered in `column_mappings` and `settings`. Each client has one currency and amounts are never converted. A newer upload replaces earlier rows from the same source and client on the same dates.
- Clients, tasks and reports are live in D1 (`/api/state` plus CRUD routes in `src/worker/index.ts`, schedule maths in `src/shared/schedule.ts`). News and email still use sample data in `src/web/seed.ts` until their phases.

## Front end structure (Phase 1.5)

- Hash routes (`#/clients/Woodside`) in `src/web/hooks.ts`. Pages in `src/web/pages/`.
- Motion: Framer Motion. The 3D Memory map (three.js, react three fiber) lives in `src/web/scene/` and loads lazily. `HeroField.tsx` is the 2D canvas hero.
- Respect `prefers-reduced-motion` in every new animation. Phones get lighter scenes.
- Anything waiting on a later phase shows a "Coming in Phase X" note or a friendly toast. No dead buttons.

## Phase 1.5 review fixes (done)

- Memory map labels fade on the far side of the orb (`fadeLabel` in `scene/MemoryScene.tsx`).
- Touch: `.scene` divs and canvas use `touch-action: pan-y`, so vertical swipes scroll the page. Sideways drags and two finger gestures spin the map (`TouchGuard`). OrbitControls sets inline `touch-action: none` on r3f's container div, so the CSS rule needs `!important` and must cover `.scene div`.
- Hero ribbons and dust live in a bottom band set by `--band` on `.hello`, below all text.
- Overview order: AI models, Connectors, Reports due, Memory map (full width), Today beside News radar, Ad spend. Use `tab-full` on a card that would sit alone in a row at tablet width.
