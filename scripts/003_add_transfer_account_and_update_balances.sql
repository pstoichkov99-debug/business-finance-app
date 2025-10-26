-- Add to_account_id for transfers if not exists
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES accounts(id);

-- Add trigger to update account balances when transactions are created/updated/deleted
CREATE OR REPLACE FUNCTION update_account_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Reverse the old transaction
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount_with_vat WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance - OLD.amount_with_vat WHERE id = OLD.account_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE accounts SET balance = balance - OLD.amount_with_vat WHERE id = OLD.account_id;
      IF OLD.to_account_id IS NOT NULL THEN
        UPDATE accounts SET balance = balance + OLD.amount_with_vat WHERE id = OLD.to_account_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Reverse the old transaction
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount_with_vat WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance - OLD.amount_with_vat WHERE id = OLD.account_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE accounts SET balance = balance - OLD.amount_with_vat WHERE id = OLD.account_id;
      IF OLD.to_account_id IS NOT NULL THEN
        UPDATE accounts SET balance = balance + OLD.amount_with_vat WHERE id = OLD.to_account_id;
      END IF;
    END IF;
  END IF;

  -- Handle INSERT and UPDATE (apply new transaction)
  IF NEW.type = 'income' THEN
    UPDATE accounts SET balance = balance + NEW.amount_with_vat WHERE id = NEW.account_id;
  ELSIF NEW.type = 'expense' THEN
    UPDATE accounts SET balance = balance + NEW.amount_with_vat WHERE id = NEW.account_id;
  ELSIF NEW.type = 'transfer' THEN
    UPDATE accounts SET balance = balance + NEW.amount_with_vat WHERE id = NEW.account_id;
    IF NEW.to_account_id IS NOT NULL THEN
      UPDATE accounts SET balance = balance - NEW.amount_with_vat WHERE id = NEW.to_account_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS transaction_balance_update ON transactions;
CREATE TRIGGER transaction_balance_update
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balances();
