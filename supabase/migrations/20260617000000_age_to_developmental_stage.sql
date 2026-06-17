-- Replace age column with developmental_stage in children table
-- PRD requires: "No real names, no dates of birth, and no exact ages are permitted"
-- PRD specifies: "Developmental Level" dropdown (Preschool, Early Primary, Older Kids)

-- Add new column
alter table public.children
  add column developmental_stage text
  check (developmental_stage in ('preschool', 'early_primary', 'older_kids'));

-- Migrate existing data: map age ranges to developmental stages
update public.children
  set developmental_stage = case
    when age <= 5 then 'preschool'
    when age <= 8 then 'early_primary'
    else 'older_kids'
  end;

-- Set NOT NULL after data migration
alter table public.children
  alter column developmental_stage set not null;

-- Drop old age column
alter table public.children
  drop column age;

-- Remove 'custom' from stories challenge check constraint (PRD bans free-text input)
-- Drop existing constraint and recreate without 'custom'
alter table public.stories
  drop constraint stories_challenge_check;

alter table public.stories
  add constraint stories_challenge_check
  check (challenge in ('anger', 'sharing', 'screentime', 'truth', 'chores',
    'stopping_games', 'turning_off_tv', 'giving_back_tablet',
    'yelling', 'hitting', 'tantrum_no',
    'leaving_bedroom', 'refusing_teeth', 'staying_up_late',
    'sharing_toys', 'telling_truth', 'chores_patience'));
