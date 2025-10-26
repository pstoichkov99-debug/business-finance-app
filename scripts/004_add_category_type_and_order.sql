-- Add type field to categories (income or expense)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense';

-- Update existing categories to have expense type by default
UPDATE categories SET type = 'expense' WHERE type IS NULL;

-- Set order_index for existing categories if not set
UPDATE categories SET order_index = 0 WHERE order_index IS NULL;

-- Update order_index to allow reordering
ALTER TABLE categories ALTER COLUMN order_index SET DEFAULT 0;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_categories_type_order ON categories(type, order_index);
