-- Enable Row Level Security on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication
DROP POLICY IF EXISTS "Allow users to read their own roles" ON user_roles;
DROP POLICY IF EXISTS "Allow read own roles" ON user_roles;

-- Create policy to allow authenticated users to SELECT their own role entries
CREATE POLICY "Allow users to read their own roles"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
