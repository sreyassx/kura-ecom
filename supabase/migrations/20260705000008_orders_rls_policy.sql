-- Ensure RLS is enabled on the orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing public insert policies on orders if they exist to avoid duplication
DROP POLICY IF EXISTS "Allow public inserts" ON orders;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON orders;

-- Create policy to allow anyone (public, anonymous, authenticated) to INSERT orders
CREATE POLICY "Allow public inserts"
ON orders
FOR INSERT
WITH CHECK (true);
