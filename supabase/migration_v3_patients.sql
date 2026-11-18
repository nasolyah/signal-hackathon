-- «Сигнал» — migration v3: reports from patients and relatives, not only staff. Safe to re-run.
-- Run in Supabase SQL editor of project xjcvzddizrnmtsnahmbb, after migration_v2.sql.
alter table incidents add column if not exists reporter_type text not null default 'staff'
  check (reporter_type in ('staff', 'patient'));   -- 'patient' = patient or relative
notify pgrst, 'reload schema';
