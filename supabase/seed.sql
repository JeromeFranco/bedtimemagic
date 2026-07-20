-- Development seed data
-- Run with: supabase db reset

-- Test user
-- The on_auth_user_created trigger will automatically create default children
insert into auth.users (
  id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, role, aud
) values (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
);
