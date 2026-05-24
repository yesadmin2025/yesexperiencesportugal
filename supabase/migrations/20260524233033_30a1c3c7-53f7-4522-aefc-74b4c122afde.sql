-- Journal posts (Local Stories)
create table if not exists public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  hero_image_url text,
  hero_image_alt text,
  region text,
  signature_slug text,
  author_name text,
  published_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_posts_status_published_at_idx
  on public.journal_posts (status, published_at desc);
create index if not exists journal_posts_slug_idx
  on public.journal_posts (slug);

alter table public.journal_posts enable row level security;

create policy "Anyone can read published journal posts"
  on public.journal_posts
  for select
  to anon, authenticated
  using (status = 'published');

create policy "Admins can read all journal posts"
  on public.journal_posts
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can insert journal posts"
  on public.journal_posts
  for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update journal posts"
  on public.journal_posts
  for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can delete journal posts"
  on public.journal_posts
  for delete
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create trigger journal_posts_set_updated_at
  before update on public.journal_posts
  for each row execute function public.set_updated_at();