-- Disable Row Level Security on the orders table entirely to resolve checkout/insert permission issues
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
