-- Enable Row Level Security on site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON site_settings;
DROP POLICY IF EXISTS "Allow authenticated users to manage settings" ON site_settings;

-- Create policy to allow anyone (public/anonymous) to SELECT settings
CREATE POLICY "Allow public read access"
ON site_settings
FOR SELECT
USING (true);

-- Create policy to allow authenticated users to perform ALL operations (INSERT, UPDATE, SELECT)
CREATE POLICY "Allow authenticated users to manage settings"
ON site_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Run the same checks and policies for homepage_config table if it exists separately
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'homepage_config') THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE homepage_config ENABLE ROW LEVEL SECURITY;';
    
    -- Drop existing policies if they exist
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read access" ON homepage_config;';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to manage settings" ON homepage_config;';
    
    -- Create policies
    EXECUTE 'CREATE POLICY "Allow public read access" ON homepage_config FOR SELECT USING (true);';
    EXECUTE 'CREATE POLICY "Allow authenticated users to manage settings" ON homepage_config FOR ALL TO authenticated USING (true) WITH CHECK (true);';
  END IF;
END $$;
