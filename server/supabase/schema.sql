create extension if not exists "pgcrypto";

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete set null,
  name text not null,
  url text not null,
  description text not null,
  tags text[] default '{}'::text[],
  avg_rating numeric(3,2) default 0,
  rating_count integer default 0,
  created_at timestamptz default now(),
  screenshot_url text,
  screenshot_status text default 'pending',
  screenshot_updated_at timestamptz
);

alter table public.sites add column if not exists screenshot_url text;
alter table public.sites add column if not exists screenshot_status text default 'pending';
alter table public.sites add column if not exists screenshot_updated_at timestamptz;

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites on delete cascade,
  user_id uuid references auth.users on delete set null,
  score integer not null check (score >= 1 and score <= 5),
  comment text,
  created_at timestamptz default now()
);

alter table public.ratings drop constraint if exists ratings_score_check;
alter table public.ratings add constraint ratings_score_check check (score >= 1 and score <= 5);

create unique index if not exists ratings_one_per_user_site_idx
  on public.ratings (site_id, user_id)
  where user_id is not null;

create table if not exists public.comment_replies (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid references public.ratings on delete cascade,
  parent_reply_id uuid references public.comment_replies on delete cascade,
  user_id uuid references auth.users on delete set null,
  comment text not null,
  created_at timestamptz default now()
);

alter table public.comment_replies add column if not exists parent_reply_id uuid references public.comment_replies on delete cascade;

create unique index if not exists comment_replies_one_per_user_review_idx
  on public.comment_replies (rating_id, user_id)
  where parent_reply_id is null and user_id is not null;

create unique index if not exists comment_replies_one_per_user_reply_idx
  on public.comment_replies (parent_reply_id, user_id)
  where parent_reply_id is not null and user_id is not null;

create table if not exists public.site_screenshots (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites on delete cascade,
  url text not null,
  source text default 'manual',
  created_at timestamptz default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites on delete cascade,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  unique (site_id, user_id)
);

alter table public.sites enable row level security;
alter table public.ratings enable row level security;
alter table public.favorites enable row level security;
alter table public.comment_replies enable row level security;
alter table public.site_screenshots enable row level security;

create policy "Sites are viewable by everyone"
  on public.sites for select
  using (true);

create policy "Authenticated users can create sites"
  on public.sites for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update sites"
  on public.sites for update
  to authenticated
  using (auth.uid() = owner_id);

create policy "Ratings are viewable by everyone"
  on public.ratings for select
  using (true);

create policy "Authenticated users can rate"
  on public.ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Replies are viewable by everyone"
  on public.comment_replies for select
  using (true);

create policy "Authenticated users can reply"
  on public.comment_replies for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Screenshots are viewable by everyone"
  on public.site_screenshots for select
  using (true);

create policy "Authenticated users can upload screenshots"
  on public.site_screenshots for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.sites s
      where s.id = site_id
        and s.owner_id = auth.uid()
    )
  );

create policy "Favorites are viewable by owners"
  on public.favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated users can favorite"
  on public.favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Owners can delete favorites"
  on public.favorites for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.recalculate_site_rating()
returns trigger
language plpgsql
as $$
begin
  update public.sites
  set
    avg_rating = (select coalesce(avg(score), 0) from public.ratings where site_id = new.site_id),
    rating_count = (select count(*) from public.ratings where site_id = new.site_id)
  where id = new.site_id;
  return new;
end;
$$;

create or replace trigger rating_inserted
after insert on public.ratings
for each row execute function public.recalculate_site_rating();

create index if not exists sites_tags_idx on public.sites using gin (tags);
create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists favorites_site_idx on public.favorites (site_id);
create index if not exists site_screenshots_site_idx on public.site_screenshots (site_id);
