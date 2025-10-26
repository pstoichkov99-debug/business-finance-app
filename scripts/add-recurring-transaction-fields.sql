-- Add recurring transaction fields to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_frequency TEXT CHECK (recurrence_frequency IN ('weekly', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE;

-- Create index for faster queries on recurring transactions
CREATE INDEX IF NOT EXISTS idx_transactions_is_recurring ON transactions(is_recurring);
CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions(parent_transaction_id);

-- Add comment to explain the schema
COMMENT ON COLUMN transactions.is_recurring IS 'Whether this transaction is a recurring template';
COMMENT ON COLUMN transactions.recurrence_frequency IS 'Frequency of recurrence: weekly, monthly, or yearly';
COMMENT ON COLUMN transactions.recurrence_interval IS 'Interval for recurrence (e.g., every 2 weeks, every 3 months)';
COMMENT ON COLUMN transactions.recurrence_end_date IS 'Date when recurring transactions should stop being generated';
COMMENT ON COLUMN transactions.parent_transaction_id IS 'Reference to the parent recurring transaction template';
