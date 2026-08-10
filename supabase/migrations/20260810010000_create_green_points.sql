-- Migration: Secure Green Points System for CleanOS
-- 1. Add green_points column to public.users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS green_points INT NOT NULL DEFAULT 0 CHECK (green_points >= 0);

-- 2. Create green_points_ledger table for audit history
CREATE TABLE IF NOT EXISTS public.green_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  house_id TEXT REFERENCES public.houses(id) ON DELETE SET NULL,
  points INT NOT NULL CHECK (points > 0),
  action_type TEXT NOT NULL CHECK (action_type IN ('scheduled_pickup_completed', 'daily_collection', 'issue_reported', 'bonus_reward')),
  description TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Unique Index: Prevent duplicate awards per reference_id & action_type per resident
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_green_points_award 
  ON public.green_points_ledger (resident_id, action_type, reference_id);

-- 4. Query Performance Index
CREATE INDEX IF NOT EXISTS idx_green_points_ledger_resident 
  ON public.green_points_ledger (resident_id, created_at DESC);

-- 5. Atomic Point Awarding RPC Function with strict server-side validation & hardened search_path
CREATE OR REPLACE FUNCTION public.award_green_points(
  p_action_type TEXT,
  p_reference_id TEXT,
  p_house_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id UUID := NULL;
  v_house_id TEXT := p_house_id;
  v_points INT;
  v_description TEXT;
  v_existing_id UUID;
  v_effective_ref TEXT := p_reference_id;
  v_reporter_email TEXT := NULL;
  v_log_exists BOOLEAN := FALSE;
BEGIN
  -- 1. Validate action_type and verify trusted database state
  IF p_action_type = 'scheduled_pickup_completed' THEN
    v_points := 50;
    v_description := 'Completed Scheduled Waste Pickup (+50 Green Points)';
    
    -- Verify schedule exists AND is in 'completed' status
    SELECT ps.resident_id, ps.house_id INTO v_resident_id, v_house_id
      FROM public.pickup_schedules ps
     WHERE ps.id::text = p_reference_id
       AND ps.status = 'completed';

    IF v_house_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'reason', 'SCHEDULE_NOT_COMPLETED');
    END IF;
     
    -- Fallback to resident assigned to house if schedule resident_id is null
    IF v_resident_id IS NULL THEN
      SELECT u.id INTO v_resident_id
        FROM public.users u
       WHERE u.house_id = v_house_id AND u.role = 'resident'
       LIMIT 1;
    END IF;

  ELSIF p_action_type = 'issue_reported' THEN
    v_points := 10;
    v_description := 'Filed Waste Management Issue Report (+10 Green Points)';
    
    -- Verify complaint exists in public.complaints and extract resident_id & house_id
    SELECT c.resident_id, c.house_id INTO v_resident_id, v_house_id
      FROM public.complaints c
     WHERE c.id::text = p_reference_id;

    IF v_resident_id IS NULL AND v_house_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'reason', 'COMPLAINT_NOT_FOUND');
    END IF;

    -- Fallback to house resident if complaint resident_id is null
    IF v_resident_id IS NULL AND v_house_id IS NOT NULL THEN
      SELECT u.id INTO v_resident_id
        FROM public.users u
       WHERE u.house_id = v_house_id AND u.role = 'resident'
       LIMIT 1;
    END IF;

  ELSIF p_action_type = 'daily_collection' THEN
    v_points := 20;
    v_description := 'Verified Daily Waste Bin Collection (+20 Green Points)';
    
    -- Force server-generated reference ID to CURRENT_DATE (ignore client date parameters)
    v_effective_ref := CURRENT_DATE::text;

    -- Derive house_id and resident_id from authenticated caller or worker scan parameter
    IF auth.uid() IS NOT NULL THEN
      SELECT house_id, id INTO v_house_id, v_resident_id
        FROM public.users
       WHERE id = auth.uid() AND role = 'resident';
    END IF;

    IF v_house_id IS NULL AND p_house_id IS NOT NULL THEN
      v_house_id := p_house_id;
    END IF;

    IF v_house_id IS NOT NULL THEN
      -- Verify that a valid collection_log entry exists for this house for TODAY
      SELECT EXISTS (
        SELECT 1 FROM public.collection_logs
         WHERE house_id = v_house_id
           AND collected_at::date = CURRENT_DATE
      ) INTO v_log_exists;

      IF NOT v_log_exists THEN
        RETURN jsonb_build_object('success', false, 'reason', 'NO_COLLECTION_LOG_FOUND');
      END IF;

      IF v_resident_id IS NULL THEN
        SELECT u.id INTO v_resident_id
          FROM public.users u
         WHERE u.house_id = v_house_id AND u.role = 'resident'
         LIMIT 1;
      END IF;
    END IF;

  ELSE
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_ACTION_TYPE');
  END IF;

  -- Ensure a target resident was derived
  IF v_resident_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'RESIDENT_NOT_FOUND');
  END IF;

  -- 2. Check for duplicate award using server-validated v_effective_ref
  SELECT id INTO v_existing_id 
    FROM public.green_points_ledger 
   WHERE resident_id = v_resident_id 
     AND action_type = p_action_type 
     AND reference_id = v_effective_ref;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'DUPLICATE_AWARD_PREVENTED');
  END IF;

  -- 3. Insert into ledger (Internal trigger - SECURITY DEFINER)
  INSERT INTO public.green_points_ledger (
    resident_id, house_id, points, action_type, description, reference_id
  ) VALUES (
    v_resident_id, v_house_id, v_points, p_action_type, v_description, v_effective_ref
  );

  -- 4. Atomically update user balance
  UPDATE public.users 
     SET green_points = COALESCE(green_points, 0) + v_points 
   WHERE id = v_resident_id;

  RETURN jsonb_build_object('success', true, 'points_awarded', v_points, 'resident_id', v_resident_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'reason', 'DUPLICATE_AWARD_PREVENTED');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'reason', SQLERRM);
END;
$$;

-- 6. Grant RPC execution strictly to authenticated users (NO anon execution)
REVOKE ALL ON FUNCTION public.award_green_points(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_green_points(TEXT, TEXT, TEXT) TO authenticated;

-- 7. Enable RLS on green_points_ledger
ALTER TABLE public.green_points_ledger ENABLE ROW LEVEL SECURITY;

-- NO INSERT policy: Direct INSERT from client is completely disabled!
DROP POLICY IF EXISTS "green_points_ledger_insert" ON public.green_points_ledger;

-- Restricted SELECT policy: Only own records or staff can read ledger
DROP POLICY IF EXISTS "green_points_ledger_select" ON public.green_points_ledger;
CREATE POLICY "green_points_ledger_select" ON public.green_points_ledger
  FOR SELECT TO authenticated
  USING (
    auth.uid() = resident_id 
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'worker')
  );

-- 8. Add to Realtime Publication if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'green_points_ledger'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.green_points_ledger;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
