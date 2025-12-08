-- Rename full_name to real_name in profiles
ALTER TABLE profiles RENAME COLUMN full_name TO real_name;

-- Remove website from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS website;

-- Add nickname to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname text;

-- Add schedules array to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS schedules uuid[];

-- Add participants_id array to schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS participants_id uuid[];

-- Add availabilities_id array to schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS availabilities_id uuid[];

-- Add available_range to participants (as text array)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS available_range text[];

-- Rename participant_id to participants_id in availabilities
ALTER TABLE availabilities RENAME COLUMN participant_id TO participants_id;

-- Add schedule_id to availabilities
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE;

-- Update handle_new_user function to use real_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, real_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
