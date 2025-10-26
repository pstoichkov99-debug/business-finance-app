-- Clean up duplicate budget entries
-- This script removes duplicate budgets keeping only the most recent one

WITH ranked_budgets AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY category_id, month, COALESCE(project_id::text, 'null')
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM budgets
)
DELETE FROM budgets
WHERE id IN (
  SELECT id FROM ranked_budgets WHERE rn > 1
);

-- Add a partial unique index that handles NULL values correctly
DROP INDEX IF EXISTS budgets_category_month_project_unique;
CREATE UNIQUE INDEX budgets_category_month_project_unique 
ON budgets (category_id, month, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));
