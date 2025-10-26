-- Delete duplicate categories, keeping only the oldest one for each name
-- This will also delete associated budgets for the duplicate categories

WITH duplicates AS (
  SELECT 
    id,
    name,
    parent_id,
    ROW_NUMBER() OVER (PARTITION BY name, parent_id ORDER BY created_at ASC) as rn
  FROM categories
  WHERE parent_id IS NOT NULL  -- Only process child categories, not the main Приходи/Разходи
)
DELETE FROM categories
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
