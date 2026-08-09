-- Migration: Create pickup_schedules table for CleanOS
CREATE TABLE IF NOT EXISTS public.pickup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id TEXT NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('07:00', '12:00')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Unique index to prevent duplicate active bookings for the same house on the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_house_schedule 
  ON public.pickup_schedules (house_id, scheduled_date) 
  WHERE (status = 'scheduled');

-- Index for fast queries by date and house
CREATE INDEX IF NOT EXISTS idx_pickup_schedules_date_house
  ON public.pickup_schedules (scheduled_date, house_id);

-- Enable RLS
ALTER TABLE public.pickup_schedules ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "pickup_schedules_select_policy" ON public.pickup_schedules;
CREATE POLICY "pickup_schedules_select_policy" ON public.pickup_schedules
  FOR SELECT TO anon, authenticated
  USING (true);

-- Insert policy
DROP POLICY IF EXISTS "pickup_schedules_insert_policy" ON public.pickup_schedules;
CREATE POLICY "pickup_schedules_insert_policy" ON public.pickup_schedules
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Update policy
DROP POLICY IF EXISTS "pickup_schedules_update_policy" ON public.pickup_schedules;
CREATE POLICY "pickup_schedules_update_policy" ON public.pickup_schedules
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);
