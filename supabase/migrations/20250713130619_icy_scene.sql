/*
  # Initial Database Setup for Clarity & Peace App

  1. New Tables
    - `profiles` table for user profile information
    - `stress_entries` table for stress tracking data
    - `background_music` table for breathing exercise music
    - `exercise_music_settings` table for music configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add admin policies for background music management

  3. Functions
    - Create admin check function
    - Create user analytics function
    - Create user management functions
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stress_entries table
CREATE TABLE IF NOT EXISTS stress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stress_score integer NOT NULL CHECK (stress_score >= 1 AND stress_score <= 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create background_music table
CREATE TABLE IF NOT EXISTS background_music (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create exercise_music_settings table
CREATE TABLE IF NOT EXISTS exercise_music_settings (
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

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Stress entries policies
CREATE POLICY "Users can view own stress entries"
  ON stress_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stress entries"
  ON stress_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stress entries"
  ON stress_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stress entries"
  ON stress_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Background music policies (admin only for management, all users can read)
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

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
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

-- Function to get user analytics (admin only)
CREATE OR REPLACE FUNCTION get_user_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_users integer;
  active_today integer;
  active_week integer;
  active_month integer;
BEGIN
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get total users
  SELECT COUNT(*) INTO total_users
  FROM auth.users
  WHERE aud = 'authenticated';

  -- Get active users today
  SELECT COUNT(*) INTO active_today
  FROM auth.users
  WHERE aud = 'authenticated'
  AND last_sign_in_at >= CURRENT_DATE;

  -- Get active users this week
  SELECT COUNT(*) INTO active_week
  FROM auth.users
  WHERE aud = 'authenticated'
  AND last_sign_in_at >= DATE_TRUNC('week', CURRENT_DATE);

  -- Get active users this month
  SELECT COUNT(*) INTO active_month
  FROM auth.users
  WHERE aud = 'authenticated'
  AND last_sign_in_at >= DATE_TRUNC('month', CURRENT_DATE);

  result := json_build_object(
    'totalUsers', total_users,
    'activeToday', active_today,
    'activeThisWeek', active_week,
    'activeThisMonth', active_month
  );

  RETURN result;
END;
$$;

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'email', email,
      'created_at', created_at,
      'last_sign_in_at', last_sign_in_at,
      'banned_until', banned_until
    )
  ) INTO result
  FROM auth.users
  WHERE aud = 'authenticated'
  ORDER BY created_at DESC;

  RETURN result;
END;
$$;

-- Function to update user status (admin only)
CREATE OR REPLACE FUNCTION update_user_status(target_user_id uuid, is_banned boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- This function would need to be implemented with proper admin SDK access
  -- For now, return a placeholder
  result := json_build_object(
    'success', true,
    'message', 'User status update requested'
  );

  RETURN result;
END;
$$;

-- Function to delete user account (admin only)
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if current user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Delete user's data first
  DELETE FROM stress_entries WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;

  result := json_build_object(
    'success', true,
    'message', 'User data deleted successfully'
  );

  RETURN result;
END;
$$;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (NEW.id, '', '');
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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