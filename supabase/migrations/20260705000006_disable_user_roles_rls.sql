-- Disable Row Level Security on user_roles table entirely to resolve persistent cache/recursion corruption
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
