-- Seed default child profiles for new users on signup

create or replace function public.seed_children()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.children (user_id, name, developmental_stage, protagonist)
  values
    (new.id, 'Buddy',  'early_primary', 'barnaby'),
    (new.id, 'Sparky', 'preschool',     'nova'),
    (new.id, 'Rocket', 'older_kids',    'pip'),
    (new.id, 'Sunny',  'preschool',     'luna'),
    (new.id, 'Pixel',  'early_primary', 'rex');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_children();

-- Backfill existing users who have no children
insert into public.children (user_id, name, developmental_stage, protagonist)
select u.id, v.name, v.developmental_stage, v.protagonist
from auth.users u
cross join (values
  ('Buddy',  'early_primary', 'barnaby'),
  ('Sparky', 'preschool',     'nova'),
  ('Rocket', 'older_kids',    'pip'),
  ('Sunny',  'preschool',     'luna'),
  ('Pixel',  'early_primary', 'rex')
) as v(name, developmental_stage, protagonist)
where not exists (
  select 1 from public.children c where c.user_id = u.id
);
