-- Safe import script that checks for existing categories before inserting
-- This script will NOT create duplicates

DO $$
DECLARE
  income_id uuid;
  expense_id uuid;
  
  -- Second level category IDs
  operational_income_id uuid;
  financial_income_id uuid;
  extraordinary_income_id uuid;
  
  operational_expense_id uuid;
  financial_expense_id uuid;
  investment_expense_id uuid;
  extraordinary_expense_id uuid;
BEGIN
  -- Get existing parent category IDs
  SELECT id INTO income_id FROM categories WHERE name = 'Приходи' AND type = 'income' LIMIT 1;
  SELECT id INTO expense_id FROM categories WHERE name = 'Разходи' AND type = 'expense' LIMIT 1;

  -- Insert second-level INCOME categories (only if they don't exist)
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Оперативни приходи', 'income', income_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Оперативни приходи' AND parent_id = income_id)
  RETURNING id INTO operational_income_id;
  
  IF operational_income_id IS NULL THEN
    SELECT id INTO operational_income_id FROM categories WHERE name = 'Оперативни приходи' AND parent_id = income_id;
  END IF;

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Финансови приходи', 'income', income_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Финансови приходи' AND parent_id = income_id)
  RETURNING id INTO financial_income_id;
  
  IF financial_income_id IS NULL THEN
    SELECT id INTO financial_income_id FROM categories WHERE name = 'Финансови приходи' AND parent_id = income_id;
  END IF;

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Извънредни приходи', 'income', income_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Извънредни приходи' AND parent_id = income_id)
  RETURNING id INTO extraordinary_income_id;
  
  IF extraordinary_income_id IS NULL THEN
    SELECT id INTO extraordinary_income_id FROM categories WHERE name = 'Извънредни приходи' AND parent_id = income_id;
  END IF;

  -- Insert second-level EXPENSE categories (only if they don't exist)
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Оперативни разходи', 'expense', expense_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Оперативни разходи' AND parent_id = expense_id)
  RETURNING id INTO operational_expense_id;
  
  IF operational_expense_id IS NULL THEN
    SELECT id INTO operational_expense_id FROM categories WHERE name = 'Оперативни разходи' AND parent_id = expense_id;
  END IF;

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Финансови разходи', 'expense', expense_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Финансови разходи' AND parent_id = expense_id)
  RETURNING id INTO financial_expense_id;
  
  IF financial_expense_id IS NULL THEN
    SELECT id INTO financial_expense_id FROM categories WHERE name = 'Финансови разходи' AND parent_id = expense_id;
  END IF;

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Инвестиционни разходи', 'expense', expense_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Инвестиционни разходи' AND parent_id = expense_id)
  RETURNING id INTO investment_expense_id;
  
  IF investment_expense_id IS NULL THEN
    SELECT id INTO investment_expense_id FROM categories WHERE name = 'Инвестиционни разходи' AND parent_id = expense_id;
  END IF;

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Извънредни разходи', 'expense', expense_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Извънредни разходи' AND parent_id = expense_id)
  RETURNING id INTO extraordinary_expense_id;
  
  IF extraordinary_expense_id IS NULL THEN
    SELECT id INTO extraordinary_expense_id FROM categories WHERE name = 'Извънредни разходи' AND parent_id = expense_id;
  END IF;

  -- Insert third-level categories under Оперативни приходи
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Продажби на стоки', 'income', operational_income_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Продажби на стоки' AND parent_id = operational_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Продажби на услуги', 'income', operational_income_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Продажби на услуги' AND parent_id = operational_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Приходи от наеми', 'income', operational_income_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Приходи от наеми' AND parent_id = operational_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Приходи от лицензи и роялти', 'income', operational_income_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Приходи от лицензи и роялти' AND parent_id = operational_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Други оперативни приходи', 'income', operational_income_id, 5
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Други оперативни приходи' AND parent_id = operational_income_id);

  -- Insert third-level categories under Финансови приходи
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Получени лихви', 'income', financial_income_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Получени лихви' AND parent_id = financial_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Дивиденти', 'income', financial_income_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Дивиденти' AND parent_id = financial_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Печалби от валутни операции', 'income', financial_income_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Печалби от валутни операции' AND parent_id = financial_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Други финансови приходи', 'income', financial_income_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Други финансови приходи' AND parent_id = financial_income_id);

  -- Insert third-level categories under Извънредни приходи
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Продажба на дълготрайни активи', 'income', extraordinary_income_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Продажба на дълготрайни активи' AND parent_id = extraordinary_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Застрахователни обезщетения', 'income', extraordinary_income_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Застрахователни обезщетения' AND parent_id = extraordinary_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Дарения и безвъзмездни помощи', 'income', extraordinary_income_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Дарения и безвъзмездни помощи' AND parent_id = extraordinary_income_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Други извънредни приходи', 'income', extraordinary_income_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Други извънредни приходи' AND parent_id = extraordinary_income_id);

  -- Insert third-level categories under Оперативни разходи
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Материали и суровини', 'expense', operational_expense_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Материали и суровини' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Стоки за препродажба', 'expense', operational_expense_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Стоки за препродажба' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Заплати и възнаграждения', 'expense', operational_expense_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Заплати и възнаграждения' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Осигуровки', 'expense', operational_expense_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Осигуровки' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Наеми', 'expense', operational_expense_id, 5
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Наеми' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Комунални услуги', 'expense', operational_expense_id, 6
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Комунални услуги' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Транспортни разходи', 'expense', operational_expense_id, 7
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Транспортни разходи' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Маркетинг и реклама', 'expense', operational_expense_id, 8
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Маркетинг и реклама' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Консултантски услуги', 'expense', operational_expense_id, 9
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Консултантски услуги' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Амортизации', 'expense', operational_expense_id, 10
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Амортизации' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Поддръжка и ремонти', 'expense', operational_expense_id, 11
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Поддръжка и ремонти' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Застраховки', 'expense', operational_expense_id, 12
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Застраховки' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Офис консумативи', 'expense', operational_expense_id, 13
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Офис консумативи' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Телефон и интернет', 'expense', operational_expense_id, 14
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Телефон и интернет' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Командировки', 'expense', operational_expense_id, 15
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Командировки' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Обучения и развитие', 'expense', operational_expense_id, 16
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Обучения и развитие' AND parent_id = operational_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Други оперативни разходи', 'expense', operational_expense_id, 17
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Други оперативни разходи' AND parent_id = operational_expense_id);

  -- Insert third-level categories under Финансови разходи
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Лихви по кредити', 'expense', financial_expense_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Лихви по кредити' AND parent_id = financial_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Банкови такси', 'expense', financial_expense_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Банкови такси' AND parent_id = financial_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Загуби от валутни операции', 'expense', financial_expense_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Загуби от валутни операции' AND parent_id = financial_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Други финансови разходи', 'expense', financial_expense_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Други финансови разходи' AND parent_id = financial_expense_id);

  -- Insert third-level categories under Инвестиционни разходи
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Покупка на машини, автомобили, техника', 'expense', investment_expense_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Покупка на машини, автомобили, техника' AND parent_id = investment_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Покупка на недвижими имоти', 'expense', investment_expense_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Покупка на недвижими имоти' AND parent_id = investment_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Софтуер и лицензи', 'expense', investment_expense_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Софтуер и лицензи' AND parent_id = investment_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Инвестиции в дъщерни дружества', 'expense', investment_expense_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Инвестиции в дъщерни дружества' AND parent_id = investment_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Други инвестиционни разходи', 'expense', investment_expense_id, 5
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Други инвестиционни разходи' AND parent_id = investment_expense_id);

  -- Insert third-level categories under Извънредни разходи
  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Глоби и санкции', 'expense', extraordinary_expense_id, 1
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Глоби и санкции' AND parent_id = extraordinary_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Загуби от продажба на активи', 'expense', extraordinary_expense_id, 2
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Загуби от продажба на активи' AND parent_id = extraordinary_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Щети и обезщетения', 'expense', extraordinary_expense_id, 3
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Щети и обезщетения' AND parent_id = extraordinary_expense_id);

  INSERT INTO categories (name, type, parent_id, order_index)
  SELECT 'Други извънредни разходи', 'expense', extraordinary_expense_id, 4
  WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Други извънредни разходи' AND parent_id = extraordinary_expense_id);

END $$;
