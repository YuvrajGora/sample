-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Auth Users (in auth.users schema)
-- Resident A101 User
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '1a101a10-1a10-1a10-1a10-1a101a101a10',
  'authenticated',
  'authenticated',
  'a101@cleanos.city',
  crypt('password123', gen_salt('bf')),
  now(), NULL, now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Worker SW-2041 User
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '2c20412c-2c20-2c20-2c20-2c20412c2041',
  'authenticated',
  'authenticated',
  'worker@cleanos.city',
  crypt('password123', gen_salt('bf')),
  now(), NULL, now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Admin Priya Nair User
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '3a30003a-3a30-3a30-3a30-3a30003a3000',
  'authenticated',
  'authenticated',
  'admin@cleanos.city',
  crypt('password123', gen_salt('bf')),
  now(), NULL, now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(), now(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Auth Identities
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  '1a101a10-1a10-1a10-1a10-1a101a101a10',
  '1a101a10-1a10-1a10-1a10-1a101a101a10',
  jsonb_build_object('sub', '1a101a10-1a10-1a10-1a10-1a101a101a10', 'email', 'a101@cleanos.city'),
  'email', now(), now(), now()
) ON CONFLICT (provider, id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  '2c20412c-2c20-2c20-2c20-2c20412c2041',
  '2c20412c-2c20-2c20-2c20-2c20412c2041',
  jsonb_build_object('sub', '2c20412c-2c20-2c20-2c20-2c20412c2041', 'email', 'worker@cleanos.city'),
  'email', now(), now(), now()
) ON CONFLICT (provider, id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  '3a30003a-3a30-3a30-3a30-3a30003a3000',
  '3a30003a-3a30-3a30-3a30-3a30003a3000',
  jsonb_build_object('sub', '3a30003a-3a30-3a30-3a30-3a30003a3000', 'email', 'admin@cleanos.city'),
  'email', now(), now(), now()
) ON CONFLICT (provider, id) DO NOTHING;

-- 3. Create public.users profiles
INSERT INTO public.users (
  id, email, role, name, avatar, house_id, created_at
) VALUES (
  '1a101a10-1a10-1a10-1a10-1a101a101a10',
  'a101@cleanos.city',
  'resident',
  'Resident A101',
  'RA',
  'H001',
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (
  id, email, role, name, avatar, employee_id, ward, zone, created_at
) VALUES (
  '2c20412c-2c20-2c20-2c20-2c20412c2041',
  'worker@cleanos.city',
  'worker',
  'Ramesh Kumar',
  'RK',
  'SW-2041',
  'Ward 12',
  'Zone 4 — Riverside',
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (
  id, email, role, name, avatar, ward, created_at
) VALUES (
  '3a30003a-3a30-3a30-3a30-3a30003a3000',
  'admin@cleanos.city',
  'admin',
  'Priya Nair',
  'PN',
  'Central Municipal Zone',
  now()
) ON CONFLICT (id) DO NOTHING;
