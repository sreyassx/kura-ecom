-- Drop ALL potential recursive policies on user_roles
DROP POLICY IF EXISTS "Allow users to read their own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow read own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow public read access" ON user_roles;
DROP POLICY IF EXISTS "Allow public read access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow admins to manage all roles" ON user_roles;
DROP POLICY IF EXISTS "public_read_user_roles" ON user_roles;

-- Reset Row Level Security cleanly
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create a simple, non-recursive select policy
CREATE POLICY "public_read_user_roles"
ON user_roles FOR SELECT
USING (true);
