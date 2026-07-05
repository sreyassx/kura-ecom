-- Enable Row Level Security on user_roles (if not already enabled)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop previous select policies
DROP POLICY IF EXISTS "Allow users to read their own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow read own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow public read access to user_roles" ON user_roles;

-- Create policy to allow public select on user_roles (prevents client-side auth state race conditions)
CREATE POLICY "Allow public read access to user_roles"
ON user_roles
FOR SELECT
USING (true);
