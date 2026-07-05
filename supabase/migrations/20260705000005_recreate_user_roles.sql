-- Create temp backup table of user roles
CREATE TEMP TABLE user_roles_backup AS 
SELECT id, user_id, role::text AS role 
FROM user_roles;

-- Drop the table with CASCADE to clear any corrupted cached triggers/policies/views
DROP TABLE IF EXISTS user_roles CASCADE;

-- Recreate the table cleanly
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple non-recursive policy
CREATE POLICY "simple_read"
ON user_roles FOR SELECT
USING (true);

-- Restore the data from backup
INSERT INTO user_roles (id, user_id, role)
SELECT id, user_id, role 
FROM user_roles_backup;
