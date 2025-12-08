-- RLS Recursion Fix
-- Run this in your Supabase SQL Editor

-- 1. Create a security definer function to check schedule membership safely
CREATE OR REPLACE FUNCTION public.is_schedule_member(_schedule_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM participants
    WHERE schedule_id = _schedule_id
    AND user_id = auth.uid()
  );
$$;

-- 2. Update 'participants' table policy
DROP POLICY IF EXISTS "Participants are viewable by everyone in the schedule." ON participants;

CREATE POLICY "Participants are viewable by everyone in the schedule." ON participants
  FOR SELECT USING (
    -- Allow viewing if you are a member of the schedule (checked via secure function) OR if it's your own row
    is_schedule_member(schedule_id) OR user_id = auth.uid()
  );

-- 3. Update 'availabilities' table policy (to be safe and consistent)
DROP POLICY IF EXISTS "Availabilities are viewable by everyone in the schedule." ON availabilities;

CREATE POLICY "Availabilities are viewable by everyone in the schedule." ON availabilities
  FOR SELECT USING (
    is_schedule_member(schedule_id)
  );
