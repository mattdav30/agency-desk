// Sample data for Phase 1. Phase 2 and later replace each block with D1 data.

export const clients = [
  "Woodside", "APCH Phase 2", "QPS ASB", "ABS Campaign",
  "Amicus Intelligence", "Greg Fleming MP", "Coal Australia page",
];

export const tasks = [
  { id: 1, title: "Send Amicus daily report", client: "Amicus Intelligence", time: "5:00 pm", done: false },
  { id: 2, title: "Review Woodside creative variants", client: "Woodside", time: "10:30 am", done: true },
  { id: 3, title: "Check APCH Phase 2 landing page copy", client: "APCH Phase 2", time: "Today", done: false },
  { id: 4, title: "Reply to QPS ASB media schedule", client: "QPS ASB", time: "Today", done: false },
  { id: 5, title: "Book ABS Campaign audience review", client: "ABS Campaign", time: "Today", done: false },
];

export const reportsDue = [
  { id: 1, name: "Daily report", client: "Amicus Intelligence", days: 0, at: "5:00 pm", today: true },
  { id: 2, name: "Monthly digital report", client: "Greg Fleming MP", days: 2, at: "", today: false },
  { id: 3, name: "Monthly timesheet to boss", client: "Europe Gulf Forum", days: 5, at: "", today: false },
];

export const connectors = [
  { name: "OpenRouter", state: "setup" as const, note: "Add key in Phase 4" },
  { name: "Gmail", state: "missing" as const, note: "Planned for Phase 6" },
  { name: "Outlook", state: "missing" as const, note: "Planned for Phase 6" },
  { name: "Ollama", state: "setup" as const, note: "Runs on your own PC" },
  { name: "Cloudflare", state: "on" as const, note: "Worker, D1 and KV live" },
];

export const aiModels = {
  claudeWeeklyUsage: 42, // percent, typed in by hand for now
  active: ["Claude", "GPT 6", "Ollama local"],
  spendThisMonth: 3.4,
};

export const adSpend = [
  { client: "Woodside", channels: "Google Ads, Meta", spent: 8420, budget: 12000 },
  { client: "APCH Phase 2", channels: "StackAdapt, Meta", spent: 5180, budget: 9000 },
  { client: "QPS ASB", channels: "Meta", spent: 3960, budget: 6000 },
  { client: "ABS Campaign", channels: "Google Ads", spent: 6850, budget: 7500 },
  { client: "Amicus Intelligence", channels: "Google Ads, StackAdapt", spent: 2210, budget: 5000 },
  { client: "Greg Fleming MP", channels: "Meta", spent: 1480, budget: 2500 },
];

export const newsTopics = ["Coal Australia"];

export const news = [
  { id: 1, tag: "Prices", source: "Sample source", time: "6:50 am", headline: "Thermal coal price move sets the tone for Queensland exporters", stat: "Figure to check", idea: "Single graphic showing the week's price direction", format: "Single graphic" },
  { id: 2, tag: "Approvals", source: "Sample source", time: "6:50 am", headline: "New mine approval decision lands in the Bowen Basin", stat: "Figure to check", idea: "Carousel walking through what the approval covers", format: "Carousel" },
  { id: 3, tag: "Jobs", source: "Sample source", time: "6:50 am", headline: "Regional coal jobs and royalties return to the policy debate", stat: "Figure to check", idea: "Short video with the jobs and royalties split", format: "Short video" },
];
