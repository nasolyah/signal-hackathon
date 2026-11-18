-- «Сигнал» — migration v2: analyst → weekly digest → hospital decisions → district oversight.
-- Run AFTER schema.sql, in Supabase SQL editor. Safe to re-run.
-- Privacy rules still apply: no raw text, no names of reporters or involved people, ever.

-- 1. Districts (pilot: Samarkand region). Hospitals A–F are regrouped into 2 districts
--    so the district screen has several hospitals to compare.
create table if not exists districts (
  id text primary key,
  name text not null,
  region text not null
);

insert into districts (id, name, region) values
  ('SAM-1', 'Самаркандский район', 'Самаркандская обл.'),
  ('SAM-2', 'Ургутский район',     'Самаркандская обл.')
on conflict (id) do nothing;

alter table hospitals add column if not exists district_id text references districts(id);
update hospitals set district_id = 'SAM-1', region = 'Самаркандская обл.' where id in ('A','B','C');
update hospitals set district_id = 'SAM-2', region = 'Самаркандская обл.' where id in ('D','E','F');

-- 2. Incidents: role instead of names, self-report flag, blame flag, follow-up code.
alter table incidents add column if not exists involved_role text not null default 'unknown'
  check (involved_role in ('nurse','doctor','junior_staff','pharmacist','lab','other','unknown'));
alter table incidents add column if not exists reporter_involved boolean not null default false;  -- «это моя ошибка / я участвовал»
alter table incidents add column if not exists blame_flag boolean not null default false;         -- AI: text blames a person / looks like a denunciation
alter table incidents add column if not exists followup_code_hash text unique;                    -- sha256 of the one-time code shown to the reporter; the code itself is never stored
alter table incidents add column if not exists excluded_from_digest boolean not null default false; -- analyst: junk / blame-only report

-- 3. Voluntary contact. Separate table, analyst-only, auto-expires.
--    Never shown to hospital, district or ministry screens.
create table if not exists report_contacts (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null unique references incidents(id) on delete cascade,
  contact text not null,                                    -- Telegram @handle or phone, entered by the reporter
  delete_after timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

-- 4. Weekly digest per hospital (AI draft → analyst edits → sent to chief doctor).
create table if not exists digests (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references hospitals(id),
  period_start date not null,
  period_end date not null,
  headline text,
  items jsonb not null default '[]',
  -- items: [{ id, title, what, why, incident_ids: uuid[], pattern_id: uuid|null,
  --           actions: [{ text, strength: 'strong'|'medium'|'weak', rationale }] }]
  stats jsonb not null default '{}',                        -- {reports, near_miss_share, severe}
  analyst_note text,
  status text not null default 'draft' check (status in ('draft','sent','acknowledged')),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  unique (hospital_id, period_start)
);

alter table incidents add column if not exists digest_id uuid references digests(id) on delete set null;

-- 5. Chief doctor's decision per digest item.
create table if not exists digest_actions (
  id uuid primary key default gen_random_uuid(),
  digest_id uuid not null references digests(id) on delete cascade,
  item_id text not null,
  decision text not null check (decision in ('accepted','rejected')),
  action_text text,
  strength text check (strength in ('strong','medium','weak')),
  reject_reason text,
  due_date date,
  status text not null default 'planned' check (status in ('planned','done')),
  done_at timestamptz,
  show_to_staff boolean not null default true,              -- «что изменилось» feed for staff
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Questions from the chief doctor to the anonymous author, relayed by the analyst.
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  digest_id uuid references digests(id) on delete set null,
  question text not null,
  answer text,
  status text not null default 'open' check (status in ('open','forwarded','answered','closed')),
  created_at timestamptz not null default now(),
  forwarded_at timestamptz,
  answered_at timestamptz
);

-- 7. District check-ins with a hospital.
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  district_id text not null references districts(id),
  hospital_id text not null references hospitals(id),
  digest_id uuid references digests(id) on delete set null,
  note text,
  scheduled_for date,
  status text not null default 'scheduled' check (status in ('scheduled','done')),
  created_at timestamptz not null default now()
);

create index if not exists digests_hospital_idx on digests(hospital_id, period_start desc);
create index if not exists digest_actions_digest_idx on digest_actions(digest_id);
create index if not exists questions_incident_idx on questions(incident_id);
create index if not exists incidents_digest_idx on incidents(digest_id);

alter table districts       enable row level security;
alter table report_contacts enable row level security;
alter table digests         enable row level security;
alter table digest_actions  enable row level security;
alter table questions       enable row level security;
alter table checkins        enable row level security;
