-- Drop old triggers that reference incorrect column name
DROP TRIGGER IF EXISTS update_account_balance_on_transaction_delete ON transactions;
DROP TRIGGER IF EXISTS update_account_balance_on_transaction_update ON transactions;
DROP TRIGGER IF EXISTS update_account_balance_on_transaction_insert ON transactions;

-- Drop old trigger functions
DROP FUNCTION IF EXISTS handle_transaction_delete();
DROP FUNCTION IF EXISTS handle_transaction_update();
DROP FUNCTION IF EXISTS handle_transaction_insert();

-- Create new trigger function for transaction deletion
CREATE OR REPLACE FUNCTION handle_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Reverse the balance change for the source account
  IF OLD.type = 'income' THEN
    UPDATE accounts SET current_balance = current_balance - (ABS(COALESCE(OLD.amount_with_vat, 0)) + ABS(COALESCE(OLD.k2_amount, 0))) WHERE id = OLD.account_id;
  ELSIF OLD.type = 'expense' THEN
    UPDATE accounts SET current_balance = current_balance + (ABS(COALESCE(OLD.amount_with_vat, 0)) + ABS(COALESCE(OLD.k2_amount, 0))) WHERE id = OLD.account_id;
  ELSIF OLD.type = 'transfer' THEN
    -- Reverse transfer: add back to source, subtract from destination
    UPDATE accounts SET current_balance = current_balance + (ABS(COALESCE(OLD.amount_with_vat, 0)) + ABS(COALESCE(OLD.k2_amount, 0))) WHERE id = OLD.account_id;
    UPDATE accounts SET current_balance = current_balance - (ABS(COALESCE(OLD.amount_with_vat, 0)) + ABS(COALESCE(OLD.k2_amount, 0))) WHERE id = OLD.to_account_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction deletion
CREATE TRIGGER update_account_balance_on_transaction_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION handle_transaction_delete();
