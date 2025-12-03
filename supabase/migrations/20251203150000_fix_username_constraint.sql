ALTER TABLE profiles DROP CONSTRAINT IF EXISTS username_length;
ALTER TABLE profiles ADD CONSTRAINT username_length CHECK (char_length(username) <= 20);
