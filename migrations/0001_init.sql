create table clients (
  id integer primary key autoincrement,
  name text not null,
  channels text not null default '',
  active integer not null default 1,
  created_at text not null default (datetime('now'))
);

create table tasks (
  id integer primary key autoincrement,
  client_id integer references clients(id) on delete set null,
  title text not null,
  due_date text,
  done integer not null default 0,
  created_at text not null default (datetime('now'))
);

create table reports (
  id integer primary key autoincrement,
  client_id integer references clients(id) on delete set null,
  name text not null,
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  due_time text,
  due_day integer,
  created_at text not null default (datetime('now'))
);

create table report_runs (
  id integer primary key autoincrement,
  report_id integer not null references reports(id) on delete cascade,
  run_date text not null,
  done_at text not null default (datetime('now')),
  unique (report_id, run_date)
);

create table imports (
  id integer primary key autoincrement,
  source text not null,
  filename text not null,
  r2_key text not null,
  row_count integer not null default 0,
  created_at text not null default (datetime('now'))
);

create table ad_spend (
  id integer primary key autoincrement,
  import_id integer references imports(id) on delete cascade,
  client_id integer references clients(id) on delete set null,
  source text not null,
  channel text,
  spend_date text not null,
  spend real not null
);

create table budgets (
  client_id integer not null references clients(id) on delete cascade,
  month text not null,
  amount real not null,
  primary key (client_id, month)
);

create table column_mappings (
  source text primary key,
  mapping text not null
);

create table news_topics (
  id integer primary key autoincrement,
  name text not null,
  brief text,
  active integer not null default 1
);

create table news_items (
  id integer primary key autoincrement,
  topic_id integer not null references news_topics(id) on delete cascade,
  tag text,
  source text,
  published_at text,
  headline text not null,
  key_stat text,
  post_idea text,
  post_format text,
  url text,
  saved integer not null default 0,
  run_date text not null
);

create table ai_usage (
  id integer primary key autoincrement,
  model text not null,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd real not null default 0,
  used_at text not null default (datetime('now'))
);

create table chat_messages (
  id integer primary key autoincrement,
  role text not null check (role in ('user','assistant')),
  content text not null,
  model text,
  created_at text not null default (datetime('now'))
);

create table settings (
  key text primary key,
  value text not null
);

create index idx_tasks_done on tasks(done);
create index idx_ad_spend_client_date on ad_spend(client_id, spend_date);
create index idx_ai_usage_used_at on ai_usage(used_at);
