-- Import subcategories under existing Приходи and Разходи categories
-- This script finds the existing parent categories and inserts all subcategories

-- First, let's get the parent category IDs
WITH parent_categories AS (
  SELECT id, type FROM categories WHERE parent_id IS NULL
),
income_parent AS (
  SELECT id FROM parent_categories WHERE type = 'income' LIMIT 1
),
expense_parent AS (
  SELECT id FROM parent_categories WHERE type = 'expense' LIMIT 1
),

-- Insert second-level categories (Оперативни, Финансови, etc.)
level2_income AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'income', (SELECT id FROM income_parent), order_index
  FROM (VALUES
    ('Оперативни приходи', 1),
    ('Финансови приходи', 2),
    ('Извънредни приходи', 3)
  ) AS t(name, order_index)
  RETURNING id, name
),

level2_expense AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'expense', (SELECT id FROM expense_parent), order_index
  FROM (VALUES
    ('Оперативни разходи', 1),
    ('Финансови разходи', 2),
    ('Инвестиционни разходи', 3),
    ('Извънредни разходи', 4)
  ) AS t(name, order_index)
  RETURNING id, name
),

-- Insert third-level categories under Оперативни приходи
op_income_id AS (SELECT id FROM level2_income WHERE name = 'Оперативни приходи'),
op_income_cats AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'income', (SELECT id FROM op_income_id), order_index
  FROM (VALUES
    ('Продажби на стоки', 1),
    ('Продажби на услуги', 2),
    ('Приходи от наеми', 3),
    ('Приходи от лицензи и франчайзинг', 4),
    ('Приходи от абонаменти', 5),
    ('Приходи от комисионни', 6),
    ('Приходи от реклама', 7),
    ('Приходи от консултации', 8),
    ('Приходи от обучения', 9),
    ('Приходи от събития', 10),
    ('Приходи от дарения и спонсорства', 11),
    ('Приходи от субсидии и грантове', 12),
    ('Приходи от възстановени разходи', 13),
    ('Приходи от отстъпки и бонуси', 14),
    ('Приходи от валутни операции', 15),
    ('Други оперативни приходи', 16)
  ) AS t(name, order_index)
  RETURNING id
),

-- Insert third-level categories under Финансови приходи
fin_income_id AS (SELECT id FROM level2_income WHERE name = 'Финансови приходи'),
fin_income_cats AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'income', (SELECT id FROM fin_income_id), order_index
  FROM (VALUES
    ('Получени лихви', 1),
    ('Дивиденти', 2),
    ('Приходи от инвестиции', 3),
    ('Приходи от продажба на ценни книжа', 4),
    ('Приходи от валутни курсови разлики', 5),
    ('Други финансови приходи', 6)
  ) AS t(name, order_index)
  RETURNING id
),

-- Insert third-level categories under Извънредни приходи
extr_income_id AS (SELECT id FROM level2_income WHERE name = 'Извънредни приходи'),
extr_income_cats AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'income', (SELECT id FROM extr_income_id), order_index
  FROM (VALUES
    ('Продажба на дълготрайни активи', 1),
    ('Застрахователни обезщетения', 2),
    ('Приходи от съдебни спорове', 3),
    ('Приходи от отписани задължения', 4),
    ('Други извънредни приходи', 5)
  ) AS t(name, order_index)
  RETURNING id
),

-- Insert third-level categories under Оперативни разходи
op_expense_id AS (SELECT id FROM level2_expense WHERE name = 'Оперативни разходи'),
op_expense_cats AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'expense', (SELECT id FROM op_expense_id), order_index
  FROM (VALUES
    ('Материали и суровини', 1),
    ('Стоки за препродажба', 2),
    ('Заплати', 3),
    ('Осигуровки', 4),
    ('Наеми', 5),
    ('Комунални услуги', 6),
    ('Транспорт и гориво', 7),
    ('Маркетинг и реклама', 8),
    ('Консултантски услуги', 9),
    ('Счетоводни и правни услуги', 10),
    ('Застраховки', 11),
    ('Поддръжка и ремонт', 12),
    ('Телекомуникации и интернет', 13),
    ('Канцеларски материали', 14),
    ('Софтуер и абонаменти', 15),
    ('Обучения и развитие', 16),
    ('Командировки', 17),
    ('Представителни разходи', 18),
    ('Охрана и сигурност', 19),
    ('Почистване', 20),
    ('Амортизация', 21),
    ('Данъци и такси', 22),
    ('Банкови такси', 23),
    ('Лицензи и разрешителни', 24),
    ('Членски внос', 25),
    ('Дарения', 26),
    ('Загуби от лоши вземания', 27),
    ('Загуби от брак и липси', 28),
    ('Други оперативни разходи', 29)
  ) AS t(name, order_index)
  RETURNING id
),

-- Insert third-level categories under Финансови разходи
fin_expense_id AS (SELECT id FROM level2_expense WHERE name = 'Финансови разходи'),
fin_expense_cats AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'expense', (SELECT id FROM fin_expense_id), order_index
  FROM (VALUES
    ('Лихви по кредити', 1),
    ('Лихви по лизинг', 2),
    ('Банкови такси и комисионни', 3),
    ('Загуби от валутни курсови разлики', 4),
    ('Загуби от инвестиции', 5),
    ('Други финансови разходи', 6)
  ) AS t(name, order_index)
  RETURNING id
),

-- Insert third-level categories under Инвестиционни разходи
inv_expense_id AS (SELECT id FROM level2_expense WHERE name = 'Инвестиционни разходи'),
inv_expense_cats AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'expense', (SELECT id FROM inv_expense_id), order_index
  FROM (VALUES
    ('Покупка на машини, автомобили, техника', 1),
    ('Покупка на недвижими имоти', 2),
    ('Покупка на софтуер и лицензи', 3),
    ('Покупка на патенти и марки', 4),
    ('Инвестиции в дъщерни дружества', 5),
    ('Инвестиции в ценни книжа', 6),
    ('Разходи за научноизследователска дейност', 7),
    ('Други инвестиционни разходи', 8)
  ) AS t(name, order_index)
  RETURNING id
),

-- Insert third-level categories under Извънредни разходи
extr_expense_id AS (SELECT id FROM level2_expense WHERE name = 'Извънредни разходи'),
extr_expense_cats AS (
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT name, 'expense', (SELECT id FROM extr_expense_id), order_index
  FROM (VALUES
    ('Глоби и санкции', 1),
    ('Загуби от природни бедствия', 2),
    ('Загуби от кражби', 3),
    ('Загуби от съдебни спорове', 4),
    ('Загуби от продажба на дълготрайни активи', 5),
    ('Разходи за реструктуриране', 6),
    ('Други извънредни разходи', 7)
  ) AS t(name, order_index)
  RETURNING id
)

-- Final select to confirm insertion
SELECT 'Categories imported successfully' AS status;
