# Agency Desk

Personal agency workspace and AI assistant (Jarvis). Cloudflare Worker (Hono) plus React, Vite and TypeScript, with D1, KV and R2.

## Run locally

```bash
npm install
npm run db:migrate:local
npm run build
npm run dev:api        # Worker plus built site at http://localhost:8787
```

For live frontend reloads, run `npm run dev:api` in one terminal and `npm run dev` in another (Vite on port 5173 proxies `/api` to the Worker).

Local secrets go in `.dev.vars` (never committed).

## One time Cloudflare setup

```bash
npx wrangler login
npx wrangler d1 create agency-desk          # copy database_id into wrangler.jsonc
npx wrangler kv namespace create KV         # copy id into wrangler.jsonc
npx wrangler r2 bucket create agency-desk-files
npm run db:migrate:remote
```

## Deploy

```bash
npm run deploy
```

## Cloudflare Access (only your email can sign in)

1. Open the Cloudflare dashboard, then Zero Trust. Pick a team name if asked. The free plan covers up to 50 users.
2. Go to Workers & Pages, open `agency-desk`, then Settings, Domains & Routes. On the `workers.dev` row, switch on Cloudflare Access.
3. Open the Access policy it created and set one Allow rule: Emails, equal to your email.
4. Visit the Worker URL in a private window. You should see the Cloudflare login and a one time code by email.

## Secrets

```bash
npx wrangler secret put OPENROUTER_API_KEY   # Phase 4
```

All settings live in `src/config.ts`.
