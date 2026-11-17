-- «Сигнал» — Supabase schema. Run in Supabase SQL editor.
-- Privacy: raw report text is NEVER stored. Only de-identified text.

create extension if not exists vector;

create table if not exists hospitals (
  id text primary key,            -- 'A'..'F' (used in QR links /report?h=A)
  name text not null,
  region text not null
);

insert into hospitals (id, name, region) values
  ('A', 'Больница А', 'Ташкент'),
  ('B', 'Больница Б', 'Самарканд'),
  ('C', 'Больница В', 'Фергана'),
  ('D', 'Больница Г', 'Андижан'),
  ('E', 'Больница Д', 'Бухара'),
  ('F', 'Больница Е', 'Наманган')
on conflict (id) do nothing;

create table if not exists patterns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  incident_count int not null default 0,
  hospital_count int not null default 0,
  night_share numeric not null default 0,      -- 0..1
  top_factors text[] not null default '{}',
  status text not null default 'open' check (status in ('open','in_review','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references hospitals(id),
  department text,
  shift text not null check (shift in ('day','night')),
  incident_date date not null,                 -- date only, never exact time
  redacted_text text not null,                 -- de-identified text only
  redaction_count int not null default 0,
  incident_type text not null,
  stage text not null,
  harm text not null check (harm in ('none','mild','moderate','severe','death')),
  near_miss boolean not null,
  factors text[] not null default '{}',
  summary text not null,
  embedding vector(768),                       -- change size if the embedding model differs
  pattern_id uuid references patterns(id) on delete set null,
  status text not null default 'new' check (status in ('new','in_review','closed')),
  human_verified boolean not null default false,
  -- seed/eval only (null for live reports)
  expected_type text,
  expected_harm text,
  expected_near_miss boolean,
  seed_pattern text,                           -- 'P1' | 'P2' | 'P3' | null
  created_at timestamptz not null default date_trunc('day', now())  -- day only: exact time could identify the reporter
);
-- Projects created before this line existed: make the default day-only as well.
alter table incidents alter column created_at set default date_trunc('day', now());

create index if not exists incidents_hospital_idx on incidents(hospital_id);
create index if not exists incidents_pattern_idx on incidents(pattern_id);
create index if not exists incidents_embedding_idx
  on incidents using hnsw (embedding vector_cosine_ops);

create table if not exists rca (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) on delete cascade,
  pattern_id uuid references patterns(id) on delete cascade,
  whys jsonb not null default '[]',            -- ["...", ...]
  causes jsonb not null default '{}',          -- {people:[], process:[], equipment:[], environment:[], materials:[], communication:[]}
  actions jsonb not null default '[]',         -- [{text, strength, rationale, owner, due}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (incident_id is not null or pattern_id is not null)
);

-- Nearest neighbours for pattern matching (cosine similarity = 1 - distance)
create or replace function match_incidents(query_embedding vector(768), match_count int default 5, exclude_id uuid default null)
returns table (id uuid, pattern_id uuid, hospital_id text, similarity float)
language sql stable as $$
  select i.id, i.pattern_id, i.hospital_id, 1 - (i.embedding <=> query_embedding) as similarity
  from incidents i
  where i.embedding is not null and (exclude_id is null or i.id <> exclude_id)
  order by i.embedding <=> query_embedding
  limit match_count;
$$;

-- All access goes through server code with the service role key.
alter table hospitals enable row level security;
alter table patterns  enable row level security;
alter table incidents enable row level security;
alter table rca       enable row level security;

-- Server role only (projects may be created with "don't auto-expose new tables").
-- anon / authenticated get nothing: the browser never talks to the DB directly.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Make the Data API see the new tables right away.
notify pgrst, 'reload schema';

-- Sanity check: should list hospitals, incidents, patterns, rca
select table_name from information_schema.tables where table_schema = 'public' order by 1;
