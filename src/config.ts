// One place for settings you may want to change.
// Secrets never go here. Use `wrangler secret put`.

export const config = {
  appName: "Agency Desk",
  owner: "Matt",
  timezone: "Australia/Brisbane",

  // Hard monthly cap on paid AI calls, in US dollars.
  monthlySpendCapUsd: 10,

  // Filled in during Phase 4.
  models: [] as { id: string; label: string }[],
  routing: {} as Record<string, string>,

  // Filled in during Phase 5. Cron lives in wrangler.jsonc.
  newsTopics: [] as string[],
  newsCron: "50 20 * * 0-4",
} as const;
