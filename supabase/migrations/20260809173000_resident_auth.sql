-- 1. Users Table RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Houses Table RLS Policies
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_houses" ON public.houses;
DROP POLICY IF EXISTS "anon_update_houses" ON public.houses;

CREATE POLICY "houses_select_policy" ON public.houses FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "houses_update_policy" ON public.houses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Complaints Table RLS Policies
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_complaints" ON public.complaints;
DROP POLICY IF EXISTS "anon_insert_complaints" ON public.complaints;
DROP POLICY IF EXISTS "anon_update_complaints" ON public.complaints;
DROP POLICY IF EXISTS "anon_delete_complaints" ON public.complaints;

CREATE POLICY "auth_select_complaints" ON public.complaints FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'worker')
    OR house_id = (SELECT house_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "auth_insert_complaints" ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'worker')
    OR house_id = (SELECT house_id FROM public.users WHERE id = auth.uid())
  );

-- 4. Collection Logs Table RLS Policies
ALTER TABLE public.collection_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_collection_logs" ON public.collection_logs;
DROP POLICY IF EXISTS "anon_insert_collection_logs" ON public.collection_logs;

CREATE POLICY "auth_select_collection_logs" ON public.collection_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'worker')
    OR house_id = (SELECT house_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "anon_insert_collection_logs" ON public.collection_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Notifications Table RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notifications" ON public.notifications;

CREATE POLICY "auth_select_notifications" ON public.notifications FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'worker')
    OR house_id = (SELECT house_id FROM public.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );
