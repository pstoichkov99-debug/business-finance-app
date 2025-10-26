-- Disable Row Level Security on cash_flow_schedule table
-- This is a single-user app without authentication, so RLS is not needed
ALTER TABLE cash_flow_schedule DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you want to keep RLS enabled, create a permissive policy:
-- DROP POLICY IF EXISTS "Allow all operations on cash_flow_schedule" ON cash_flow_schedule;
-- CREATE POLICY "Allow all operations on cash_flow_schedule" ON cash_flow_schedule
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);
