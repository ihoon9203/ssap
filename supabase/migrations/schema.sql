-- -- Create a table for public profiles
-- create table profiles (
--   id uuid references auth.users on delete cascade not null primary key,
--   updated_at timestamp with time zone,
--   username text unique,
--   full_name text,
--   avatar_url text,
--   website text,

--   constraint username_length check (char_length(username) <= 20)
-- );

-- -- Set up Row Level Security (RLS)
-- -- See https://supabase.com/docs/guides/auth/row-level-security for more details.
-- alter table profiles enable row level security;

-- create policy "Public profiles are viewable by everyone." on profiles
--   for select using (true);

-- create policy "Users can insert their own profile." on profiles
--   for insert with check (auth.uid() = id);

-- create policy "Users can update own profile." on profiles
--   for update using (auth.uid() = id);

-- -- This triggers a profile creation on user signup
-- create function public.handle_new_user()
-- returns trigger as $$
-- begin
--   insert into public.profiles (id, full_name, avatar_url)
--   values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
--   return new;
-- end;
-- $$ language plpgsql security definer;

-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();

-- -- Schedules Table
-- create table schedules (
--   id uuid default gen_random_uuid() primary key,
--   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
--   creator_id uuid references profiles(id) not null,
--   title text not null,
--   description text,
--   start_date date not null,
--   end_date date not null,
--   invite_code text unique not null,
--   status text check (status in ('pending', 'confirmed')) default 'pending',
--   confirmed_start_time timestamp with time zone,
--   confirmed_end_time timestamp with time zone
-- );

-- alter table schedules enable row level security;

-- create policy "Schedules are viewable by participants." on schedules
--   for select using (
--     auth.uid() = creator_id or
--     exists (
--       select 1 from participants
--       where participants.schedule_id = schedules.id
--       and participants.user_id = auth.uid()
--     )
--   );

-- create policy "Users can create schedules." on schedules
--   for insert with check (auth.uid() = creator_id);

-- create policy "Creators can update their schedules." on schedules
--   for update using (auth.uid() = creator_id);

-- -- Participants Table
-- create table participants (
--   id uuid default gen_random_uuid() primary key,
--   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
--   schedule_id uuid references schedules(id) on delete cascade not null,
--   user_id uuid references profiles(id) not null,
--   role text check (role in ('owner', 'guest')) default 'guest',
  
--   unique(schedule_id, user_id)
-- );

-- alter table participants enable row level security;

-- create policy "Participants are viewable by everyone in the schedule." on participants
--   for select using (
--     exists (
--       select 1 from participants as p
--       where p.schedule_id = participants.schedule_id
--       and p.user_id = auth.uid()
--     )
--   );

-- create policy "Users can join schedules." on participants
--   for insert with check (auth.uid() = user_id);

-- -- Availabilities Table
-- create table availabilities (
--   id uuid default gen_random_uuid() primary key,
--   participant_id uuid references participants(id) on delete cascade not null,
--   start_time timestamp with time zone not null,
--   end_time timestamp with time zone not null
-- );

-- alter table availabilities enable row level security;

-- create policy "Availabilities are viewable by everyone in the schedule." on availabilities
--   for select using (
--     exists (
--       select 1 from participants
--       where participants.id = availabilities.participant_id
--       and exists (
--         select 1 from participants as p
--         where p.schedule_id = participants.schedule_id
--         and p.user_id = auth.uid()
--       )
--     )
--   );

-- create policy "Participants can manage their own availability." on availabilities
--   for all using (
--     exists (
--       select 1 from participants
--       where participants.id = availabilities.participant_id
--       and participants.user_id = auth.uid()
--     )
--   );
