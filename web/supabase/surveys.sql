-- Run once in Supabase → SQL Editor.
-- Create writes surveys; Respond loads questions by e3_id.

create table if not exists public.surveys (
  id text primary key,
  e3_id text unique,
  title text not null,
  window_value integer not null,
  window_unit text not null check (window_unit in ('minutes', 'hours')),
  window_seconds integer not null,
  window_label text not null,
  schema_version text not null,
  questions jsonb not null default '[]'::jsonb,
  status text not null check (status in ('ready', 'requested', 'collecting', 'complete')),
  tx_hash text,
  public_key text,
  plaintext_sum double precision,
  plaintext_hex text,
  input_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists surveys_e3_id_idx on public.surveys (e3_id);
create index if not exists surveys_updated_at_idx on public.surveys (updated_at desc);

alter table public.surveys enable row level security;

drop policy if exists "surveys_select_all" on public.surveys;
drop policy if exists "surveys_insert_all" on public.surveys;
drop policy if exists "surveys_update_all" on public.surveys;

create policy "surveys_select_all" on public.surveys for select using (true);
create policy "surveys_insert_all" on public.surveys for insert with check (true);
create policy "surveys_update_all" on public.surveys for update using (true);

-- If you already ran an older schema, also run:
-- alter table public.surveys drop column if exists question_source;
-- alter table public.surveys alter column questions set not null;
-- alter table public.surveys drop constraint if exists surveys_status_check;
-- alter table public.surveys add constraint surveys_status_check
--   check (status in ('ready', 'requested', 'collecting', 'complete'));
