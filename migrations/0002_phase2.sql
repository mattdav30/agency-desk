alter table clients add column note text not null default '';
alter table reports add column client_label text;

insert into clients (name) values
  ('Woodside'), ('APCH Phase 2'), ('QPS ASB'), ('ABS Campaign'),
  ('Amicus Intelligence'), ('Greg Fleming MP'), ('Coal Australia page');

-- due_day: weekly 0 to 6 (Sunday is 0). Monthly 1 to 31, or 0 for the last day of the month.
insert into reports (client_id, name, frequency, due_time, due_day) values
  ((select id from clients where name = 'Amicus Intelligence'), 'Daily report', 'daily', '17:00', null),
  ((select id from clients where name = 'Greg Fleming MP'), 'Monthly digital report', 'monthly', null, 0);
insert into reports (client_id, client_label, name, frequency, due_time, due_day) values
  (null, 'Europe Gulf Forum', 'Monthly timesheet to boss', 'monthly', null, 0);
