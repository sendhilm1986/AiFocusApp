/*
  # Fix User Signup Trigger
  
  This migration fixes the handle_new_user() function to bypass RLS policies
  when creating user profiles during signup.
  
  1. Changes
    - Update handle_new_user() function to use SECURITY DEFINER with proper permissions
    - Ensure the function can create profiles without being blocked by RLS
*/

-- Drop and recreate the function with proper security context
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily bypass RLS for this operation
  SET SESSION AUTHORIZATION DEFAULT;
  
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (NEW.id, '', '')
  ON CONFLICT (id) DO NOTHING;
  
  -- Reset session authorization
  RESET SESSION AUTHORIZATION;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Reset session authorization in case of error
    RESET SESSION AUTHORIZATION;
    RAISE;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();