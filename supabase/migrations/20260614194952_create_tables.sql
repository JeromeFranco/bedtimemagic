-- Children profiles
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  age int not null check (age >= 6 and age <= 11),
  protagonist text not null check (protagonist in ('barnaby', 'nova', 'pip', 'luna', 'rex')),
  created_at timestamptz default now() not null
);

alter table public.children enable row level security;

create policy "Users can view their own children"
  on public.children for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own children"
  on public.children for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own children"
  on public.children for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own children"
  on public.children for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Stories
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete cascade not null,
  title text not null,
  story_text text not null,
  moral text not null,
  pillow_talk_prompt text not null,
  sleepy_affirmation text not null,
  cover_image_url text,
  challenge text not null check (challenge in ('anger', 'sharing', 'screentime', 'truth', 'chores', 'custom')),
  protagonist text not null check (protagonist in ('barnaby', 'nova', 'pip', 'luna', 'rex')),
  created_at timestamptz default now() not null
);

alter table public.stories enable row level security;

create policy "Users can view their own stories"
  on public.stories for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own stories"
  on public.stories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own stories"
  on public.stories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Lesson logs (parent feedback)
create table if not exists public.lesson_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  story_id uuid references public.stories(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete cascade not null,
  rating text not null check (rating in ('great', 'okay', 'missed')),
  created_at timestamptz default now() not null
);

alter table public.lesson_logs enable row level security;

create policy "Users can view their own lesson logs"
  on public.lesson_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own lesson logs"
  on public.lesson_logs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
