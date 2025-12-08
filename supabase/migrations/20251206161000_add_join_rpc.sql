-- Create a secure function to join a schedule
-- This bypasses RLS for the update operation
CREATE OR REPLACE FUNCTION public.join_schedule(schedule_id uuid, user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_schedule record;
BEGIN
  -- Update the schedule by appending the user_id if not already present
  UPDATE public.schedules
  SET participants_id = array_append(participants_id, user_id)
  WHERE id = schedule_id
  AND NOT (participants_id @> ARRAY[user_id]) -- Optional: prevent duplicates at DB level
  RETURNING * INTO updated_schedule;

  -- If no row was updated (e.g. invalid ID), return null or handles accordingly
  RETURN to_jsonb(updated_schedule);
END;
$$;
