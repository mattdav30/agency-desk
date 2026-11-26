-- Phase 3: ad spend imports. Every client has one currency. Amounts are never converted.
alter table clients add column currency text not null default 'AUD';

alter table imports add column client_id integer references clients(id) on delete set null;
alter table imports add column currency text;
alter table imports add column period_start text;
alter table imports add column period_end text;
alter table imports add column total_spend real not null default 0;
alter table imports add column skipped integer not null default 0;

-- spend_date is the day for daily rows, or the first day of a report range when spend_end is set.
alter table ad_spend add column campaign text;
alter table ad_spend add column ad_set text;
alter table ad_spend add column impressions integer not null default 0;
alter table ad_spend add column clicks integer not null default 0;
alter table ad_spend add column spend_end text;

create index idx_ad_spend_import on ad_spend(import_id);
create index idx_ad_spend_month on ad_spend(substr(spend_date, 1, 7));
