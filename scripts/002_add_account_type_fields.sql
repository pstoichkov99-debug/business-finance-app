-- Add new fields to accounts table for account classification
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('payment', 'savings', 'credit')),
ADD COLUMN IF NOT EXISTS account_location TEXT CHECK (account_location IN ('bank', 'cash'));

-- Update existing accounts to have default values
UPDATE accounts 
SET account_type = CASE 
  WHEN type = 'credit_card' THEN 'credit'
  ELSE 'payment'
END,
account_location = CASE
  WHEN type = 'cash' THEN 'cash'
  ELSE 'bank'
END
WHERE account_type IS NULL OR account_location IS NULL;
