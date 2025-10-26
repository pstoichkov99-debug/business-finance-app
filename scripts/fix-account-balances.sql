-- Fix accounts with NULL current_balance
-- Set current_balance to initial_balance, or 0 if initial_balance is also NULL

UPDATE accounts
SET current_balance = COALESCE(initial_balance, 0)
WHERE current_balance IS NULL;

-- Verify the fix
SELECT id, name, initial_balance, current_balance
FROM accounts
WHERE current_balance IS NULL;
