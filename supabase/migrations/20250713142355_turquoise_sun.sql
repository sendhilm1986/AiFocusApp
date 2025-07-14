/*
  # Fix Admin Schema - Handle Dependencies Properly

  1. Drop dependent objects first (triggers, then functions)
  2. Clean slate approach for all tables
  3. Recreate everything with proper admin access
  4. Simple, working RLS policies
*/

-- Drop triggers first (they depend on functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now we can safely drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_analytics() CASCADE;
DROP FUNCTION IF EXISTS get_all_users() CASCADE;
DROP FUNCTION IF EXISTS update_user_status(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS delete_user_account(uuid) CASCADE;

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS exercise_music_settings CASCADE;
DROP TABLE IF EXISTS background_music CASCADE;
DROP TABLE IF EXISTS stress_entries CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stress_entries table
CREATE TABLE stress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stress_score integer NOT NULL CHECK (stress_score >= 1 AND stress_score <= 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create background_music table
CREATE TABLE background_music (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create exercise_music_settings table
CREATE TABLE exercise_music_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text NOT NULL,
  stress_level integer DEFAULT 1,
  music_id uuid REFERENCES background_music(id),
  volume real DEFAULT 0.5,
  fade_in_duration integer DEFAULT 2,
  fade_out_duration integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(phase, stress_level)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_music ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_music_settings ENABLE ROW LEVEL SECURITY;

-- Simple, working RLS policies for profiles
CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can see all profiles
CREATE POLICY "Admin can see all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'sendhil@clickworthy.in'
    )
  );

-- Admin can delete any profile (for flush functionality)
CREATE POLICY "Admin can delete any profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'sendhil@clickworthy.in'
    )
  );

-- Simple, working RLS policies for stress entries
CREATE POLICY "Users can manage own stress entries"
  ON stress_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can see all stress entries
CREATE POLICY "Admin can see all stress entries"
  ON stress_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'sendhil@clickworthy.in'
    )
  );

-- Admin can delete any stress entries (for flush functionality)
CREATE POLICY "Admin can delete any stress entries"
  ON stress_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'sendhil@clickworthy.in'
    )
  );

-- Background music policies (everyone can read, admin can manage)
CREATE POLICY "Everyone can view active background music"
  ON background_music
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage background music"
  ON background_music
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'sendhil@clickworthy.in'
    )
  );

-- Exercise music settings policies
CREATE POLICY "Everyone can view music settings"
  ON exercise_music_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage music settings"
  ON exercise_music_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'sendhil@clickworthy.in'
    )
  );

-- Simple admin check function
CREATE OR REPLACE FUNCTION is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_id 
    AND auth.users.email = 'sendhil@clickworthy.in'
  );
END;
$$;

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (NEW.id, '', '')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert default exercise music settings
INSERT INTO exercise_music_settings (phase, stress_level, music_id, volume, fade_in_duration, fade_out_duration)
VALUES 
  ('opening_preparation', 1, NULL, 0.3, 2, 2),
  ('grounding_breathwork', 1, NULL, 0.3, 2, 2),
  ('body_awareness', 1, NULL, 0.3, 2, 2),
  ('breathing_with_intention', 1, NULL, 0.3, 2, 2),
  ('guided_visualization', 1, NULL, 0.3, 2, 2),
  ('deep_stillness', 1, NULL, 0.3, 2, 2),
  ('affirmations', 1, NULL, 0.3, 2, 2),
  ('closing', 1, NULL, 0.3, 2, 2)
ON CONFLICT (phase, stress_level) DO NOTHING;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;