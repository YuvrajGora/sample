CREATE TABLE IF NOT EXISTS bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bin_id text UNIQUE NOT NULL,
  address text NOT NULL,
  zone text NOT NULL,
  capacity text NOT NULL,
  last_collected text NOT NULL DEFAULT '—',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bins" ON bins;
CREATE POLICY "anon_select_bins" ON bins FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bins" ON bins;
CREATE POLICY "anon_insert_bins" ON bins FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bins" ON bins;
CREATE POLICY "anon_update_bins" ON bins FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bins" ON bins;
CREATE POLICY "anon_delete_bins" ON bins FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO bins (bin_id, address, zone, capacity, last_collected) VALUES
  ('BIN-112', 'MG Road, Sector 4 — near bus stop', 'Ward 15 — Central', '240 L', 'Today, 06:45 AM'),
  ('BIN-204', 'Riverside Park, Gate 2 — children play area', 'Ward 12 — Riverside', '360 L', 'Yesterday, 07:15 AM'),
  ('BIN-318', 'Lake View Apartments — Block B entrance', 'Ward 4 — Lake View', '240 L', 'Today, 07:42 AM'),
  ('BIN-425', 'Central Market, Stall 22 — vegetable section', 'Ward 15 — Central', '480 L', 'Yesterday, 09:40 AM'),
  ('BIN-507', 'Green Valley Lane, House 8 — street corner', 'Ward 9 — Green Valley', '240 L', 'Today, 08:05 AM'),
  ('BIN-612', 'Industrial Area, Plot 14 — rear gate', 'Ward 8 — Industrial', '660 L', '2 days ago, 10:20 AM'),
  ('BIN-701', 'Sector 7 Community Bin — main square', 'Ward 7 — Sector 7', '360 L', 'Yesterday, 09:12 AM')
ON CONFLICT (bin_id) DO NOTHING;