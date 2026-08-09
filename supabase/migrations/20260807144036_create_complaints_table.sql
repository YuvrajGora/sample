/*
# Create complaints table

1. New Tables
- `complaints`
  - `id` (uuid, primary key)
  - `reporter_email` (text, not null) — identifies which citizen filed the complaint
  - `reporter_name` (text, not null)
  - `address` (text, not null) — location of the reported garbage
  - `bin_number` (text, nullable) — optional bin identifier
  - `description` (text, nullable) — optional details
  - `waste_type` (text, default 'Mixed Municipal Waste')
  - `overflow` (integer, default 0) — overflow percentage 0-100
  - `priority` (text, default 'Medium') — Low / Medium / High
  - `status` (text, default 'Pending') — Pending / Assigned / In Progress / Resolved
  - `summary` (text, nullable) — AI-generated summary
  - `image_data` (text, nullable) — base64 captured photo
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `complaints`.
- Allow anon + authenticated full CRUD — the app uses mock auth (no Supabase sessions),
  so anon-key access is required for the frontend to read/write.
  Filtering by reporter_email is done client-side: citizens only see their own,
  admins see all.

3. Notes
- No user_id / auth.users FK because there is no real Supabase auth in this app.
- The reporter_email column is the ownership key used for client-side filtering.
*/

CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_email text NOT NULL,
  reporter_name text NOT NULL,
  address text NOT NULL,
  bin_number text,
  description text,
  waste_type text NOT NULL DEFAULT 'Mixed Municipal Waste',
  overflow integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Pending',
  summary text,
  image_data text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_complaints" ON complaints;
CREATE POLICY "anon_select_complaints" ON complaints FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_complaints" ON complaints;
CREATE POLICY "anon_insert_complaints" ON complaints FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_complaints" ON complaints;
CREATE POLICY "anon_update_complaints" ON complaints FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_complaints" ON complaints;
CREATE POLICY "anon_delete_complaints" ON complaints FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_complaints_reporter_email ON complaints (reporter_email);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints (created_at DESC);