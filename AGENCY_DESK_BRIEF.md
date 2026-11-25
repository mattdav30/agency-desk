# Agency Desk: Build Brief

Agency Desk is my personal agency workspace and AI assistant, called Jarvis. It keeps all my client work in one place: tasks, reports due, ad spend, inbox, news monitoring and every AI model I use. It is for me only for now. GUI first, and I add clients myself.

Read this whole file before writing code. Work in the phases below, one at a time. At the end of each phase, commit, push, and give me a short summary plus what I need to do (keys, logins, clicks). Wait for my go ahead before starting the next phase.

## Rules for you

- Ask me to confirm anything uncertain before building it.
- Free tiers only. No paid plans or new subscriptions. Pay per use AI through OpenRouter is the one exception, with a hard monthly cap.
- All API keys live in Worker secrets (`wrangler secret put`), server side only. Keep them out of the frontend, the repo and logs.
- Keep config (model list, routing rules, spend cap, news topics, cron times) in one file: `src/config.ts`.
- Writing rules for all UI text and all AI generated copy: plain, simple language. No em dashes or hyphens. Positive phrasing (avoid "not", "isn't", "don't" style wording). No hashtags. Use only figures from real sources and flag unclear figures for me to check.
- Design should look human made, in the style of Awwwards sites, never like a generic AI dashboard. No gradient washes, no emoji icons. Use inline stroke SVG icons.

## Stack

- Cloudflare Workers for the API and scheduled jobs (Hono for routing).
- Cloudflare D1 for the database, KV for cache and settings, R2 for uploaded files (ad spend exports).
- Frontend: React + Vite + TypeScript, served as Worker static assets from the same Worker.
- Privacy: protect the whole app with Cloudflare Access (free) so only my email can sign in.
- Repo: GitHub `mattdav30/agency-desk`.
- Later: a native phone app with Expo that uses the same API.

## Design

Dark "mission control" look.

- Background `#0E0F12`, panels `#16181D`, borders `#262A31`, row dividers `#23262C`
- Text `#ECEDEF`, muted text `#9BA1AB`, secondary text `#C9CDD3`
- Amber accent `#F2A93B` (primary actions, today's items), blue accent `#6EA8FE` (data, clients), green `#5FD08A` (connected / on)
- Fonts (Google Fonts): Space Grotesk for headings, Inter for body, JetBrains Mono for small uppercase labels and numbers
- Cards with 14px radius, pill shaped buttons and nav, touch targets at least 44px
- Responsive: works on a phone width too (cards stack, tables scroll sideways)

## Home screen: Mission Control

Top to bottom:

1. **Header**: logo and "Agency Desk", nav pills (Overview, Clients, Ad spend, Reports, Inbox), and the Jarvis bar.
2. **Jarvis bar**: model picker (Auto, Claude, GPT-6, Ollama local) plus a chat input. Opens a chat panel.
3. **Greeting**: today's date, "Good morning/afternoon/evening, Matt.", and a line with counts of open tasks, reports due today and waiting emails.
4. **AI models card**: Claude weekly usage (a number I type in for now), list of active models, and API spend this month against the cap (from D1).
5. **Connectors card**: status of each connection (OpenRouter, Gmail, Outlook, Ollama, Cloudflare). Green On, amber Needs setup, grey Missing.
6. **Reports due card**: next due report highlighted in amber, then the rest of the week.
7. **Memory map**: Jarvis in the centre linked to each client and the inbox. Built from the clients table.
8. **Today**: task list with checkboxes and an Add task button.
9. **News radar**: see phase 5.
10. **Ad spend**: table by client with channels, spent, budget and a pace bar.

## Data

Starting clients (I will edit these): Woodside, APCH Phase 2, QPS ASB, ABS Campaign, Amicus Intelligence, Greg Fleming MP, Coal Australia page.

Starting reports:
- Amicus Intelligence: daily report, due 5pm
- Greg Fleming MP: monthly digital report
- Europe Gulf Forum: monthly timesheet to my boss

Suggested D1 tables (adjust if you have a better idea, but tell me): `clients`, `tasks`, `reports` (with a schedule), `report_runs`, `ad_spend` (rows from imports), `imports`, `news_topics`, `news_items`, `ai_usage` (model, tokens, cost, date), `chat_messages`, `settings`.

## Phases

### Phase 0: Setup
Scaffold the repo, Worker, D1 database, KV, R2, wrangler config, migrations and a README with run and deploy steps. Deploy a hello page. Walk me through Cloudflare Access setup.

### Phase 1: Home screen with sample data
Build the Mission Control layout above with seed data. Everything should look finished and real.

### Phase 2: Clients, tasks and reports
Add, edit and delete clients, tasks and reports. Report schedules (daily, weekly, monthly) work out the next due date. Mark a report done for today. Ticking a task saves it.

### Phase 3: Ad spend
Upload CSV exports (Google Ads, Meta, StackAdapt, whatever I give you). Map columns on first upload and remember the mapping per source. Save to D1, keep the raw file in R2. Show spend by client and month with budget and pace. Budgets are set per client per month.

### Phase 4: Jarvis and multi model AI
- Every model call goes through OpenRouter with one key (`OPENROUTER_API_KEY` secret). Ollama is an option when I'm on my own PC (`http://localhost:11434`).
- The model picker sets the model. Auto mode picks by task type using rules in `src/config.ts`. Leave the GPT-6 tier and Auto rules as clear placeholders for me to fill in.
- Log every call's tokens and cost to `ai_usage`. Enforce a monthly cap (start at US$10). When it's reached, block paid calls and show a clear message.
- Jarvis gets context from D1: clients, tasks, reports due and ad spend, so I can ask "what's due today" or "how is Woodside pacing".
- Chat history saved in D1.

### Phase 5: News radar
- A Worker cron runs weekdays at 6:50am Brisbane time (`50 20 * * 0-4` in UTC).
- For each active topic, fetch news from the last 24 hours. First topic: Coal Australia (thermal and metallurgical coal, exports and prices, Queensland and NSW mines and approvals, jobs and royalties, policy, energy grid, and companies like BHP, Glencore, Whitehaven, Yancoal, New Hope, Stanmore). Suggest a free news source and check with me before picking one.
- The AI picks the 3 to 6 best stories for social posts and saves them to `news_items`.
- Each story card shows a tag, source, time, headline, key stat and a post idea with a format (single graphic, carousel, short video).
- Buttons: Draft post (Jarvis writes a bold graphic headline under 10 words plus a blurb under 40 words, stat driven, in the page's style), Save, and Read (opens the article).
- Topic chips with Add topic, so I can add more topics later.
- A "Run now" button for testing.

### Phase 6: Inbox (later)
Gmail and Outlook through OAuth. Show unread client emails and link them to clients. Plan this with me first.

### Phase 7: Phone app (later)
Expo app using the same API.
