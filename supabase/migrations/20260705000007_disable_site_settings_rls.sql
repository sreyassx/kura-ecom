-- Disable Row Level Security on site_settings table to resolve update permissions issues
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'homepage_config') THEN
    EXECUTE 'ALTER TABLE homepage_config DISABLE ROW LEVEL SECURITY;';
  END IF;
END $$;
