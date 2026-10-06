-- Tijdlijn: database schema for Supabase (Postgres).
-- Run this once in the Supabase SQL editor. Every table uses row level security:
-- people only see timelines they own or that were shared with them.

create extension if not exists pgcrypto;

-- One row per timeline. Categories live in a JSON array: [{ "id", "name", "color" }].
create table public.timelines (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users on delete cascade default auth.uid(),
  name        text not null check (char_length(name) between 1 and 60),
  kind        text not null check (kind in ('kind','mij','relatie','huisdier','huis','bedrijf','plan','anders')),
  anchor      date,
  categories  jsonb not null default '[]',
  scope_from  int  not null,
  scope_to    int  not null check (scope_to >= scope_from and scope_to - scope_from < 200),
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per moment. `date` keeps its precision: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'.
create table public.moments (
  id           uuid primary key default gen_random_uuid(),
  timeline_id  uuid not null references public.timelines on delete cascade,
  title        text not null check (char_length(title) between 1 and 80),
  note         text not null default '' check (char_length(note) <= 1000),
  emoji        text not null default '⭐',
  category_id  text not null default 'overig',
  date         text not null check (date ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
  end_date     date,
  repeat       boolean not null default false,
  status       text check (status in ('gepland','bezig','behaald','bijstellen','vervallen')),
  photos       text[] not null default '{}',   -- storage paths in the 'photos' bucket
  start_time   text check (start_time ~ '^\d{2}:\d{2}$'),      -- time of day, only with a day date
  end_time     text check (end_time ~ '^\d{2}:\d{2}$'),  -- when it ends: same day, or the last day of a period
  created_by   uuid references auth.users default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date is null or length(date) = 10),
  check (not (repeat and end_date is not null))
);
create index moments_timeline_idx on public.moments (timeline_id, date);

-- People a timeline is shared with. 'viewer' can look, 'editor' can add and change moments.
create table public.timeline_members (
  timeline_id  uuid not null references public.timelines on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  role         text not null check (role in ('viewer','editor')),
  email        text,   -- shown to the owner in the list of people
  primary key (timeline_id, user_id)
);

-- Invite links, e.g. for grandparents. Opening one while signed in adds you as a member.
create table public.share_links (
  token        text primary key default translate(encode(gen_random_bytes(18), 'base64'), '+/', '-_'),
  timeline_id  uuid not null references public.timelines on delete cascade,
  role         text not null default 'viewer' check (role in ('viewer','editor')),
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- Helpers used by the policies below.
create or replace function public.can_view(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from timelines where id = t and owner_id = auth.uid())
      or exists (select 1 from timeline_members where timeline_id = t and user_id = auth.uid());
$$;
create or replace function public.can_edit(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from timelines where id = t and owner_id = auth.uid())
      or exists (select 1 from timeline_members where timeline_id = t and user_id = auth.uid() and role = 'editor');
$$;

-- Accept an invite link. Returns the timeline id.
create or replace function public.accept_share_link(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare l share_links;
begin
  if auth.uid() is null then raise exception 'Log eerst in'; end if;
  select * into l from share_links where token = p_token and (expires_at is null or expires_at > now());
  if not found then raise exception 'Link is ongeldig of verlopen'; end if;
  if exists (select 1 from timelines where id = l.timeline_id and owner_id = auth.uid()) then return l.timeline_id; end if;
  insert into timeline_members (timeline_id, user_id, role, email) values (l.timeline_id, auth.uid(), l.role, auth.jwt() ->> 'email')
  on conflict (timeline_id, user_id) do update set email = excluded.email, role = case when 'editor' in (timeline_members.role, excluded.role) then 'editor' else 'viewer' end;
  return l.timeline_id;
end $$;

alter table public.timelines        enable row level security;
alter table public.moments          enable row level security;
alter table public.timeline_members enable row level security;
alter table public.share_links      enable row level security;

create policy "view timelines"   on public.timelines for select using (can_view(id));
create policy "create timelines" on public.timelines for insert with check (owner_id = auth.uid());
create policy "edit timelines"   on public.timelines for update using (owner_id = auth.uid());
create policy "delete timelines" on public.timelines for delete using (owner_id = auth.uid());

create policy "view moments"  on public.moments for select using (can_view(timeline_id));
create policy "write moments" on public.moments for all using (can_edit(timeline_id)) with check (can_edit(timeline_id));

create policy "see members"    on public.timeline_members for select using (can_view(timeline_id));
create policy "owner members"  on public.timeline_members for all
  using (exists (select 1 from timelines where id = timeline_id and owner_id = auth.uid()));

create policy "leave timeline" on public.timeline_members for delete using (user_id = auth.uid());

create policy "owner links" on public.share_links for all
  using (exists (select 1 from timelines where id = timeline_id and owner_id = auth.uid()));

-- Live updates when someone else changes a shared timeline.
alter publication supabase_realtime add table public.timelines, public.moments;

-- Photos: private bucket, files stored as '<timeline_id>/<file>'.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict do nothing;
create policy "view photos"   on storage.objects for select using (bucket_id = 'photos' and can_view(((storage.foldername(name))[1])::uuid));
create policy "upload photos" on storage.objects for insert with check (bucket_id = 'photos' and can_edit(((storage.foldername(name))[1])::uuid));
create policy "delete photos" on storage.objects for delete using (bucket_id = 'photos' and can_edit(((storage.foldername(name))[1])::uuid));

-- Times of day on moments, for a project made before they existed:
-- alter table public.moments add column if not exists start_time text check (start_time ~ '^\d{2}:\d{2}$');
-- alter table public.moments add column if not exists end_time text check (end_time ~ '^\d{2}:\d{2}$');
