-- Import hierarchical categories structure
-- This script creates a complete category hierarchy for Bulgarian accounting

-- First, create the top-level parent categories
INSERT INTO categories (name, type, parent_id, order_index) VALUES
('Приходи', 'income', NULL, 1),
('Разходи', 'expense', NULL, 2);

-- Get the IDs of the parent categories for reference
DO $$
DECLARE
  income_id UUID;
  expense_id UUID;
  
  -- Second level category IDs
  operative_income_id UUID;
  financial_income_id UUID;
  extraordinary_income_id UUID;
  
  operative_expense_id UUID;
  external_services_id UUID;
  labor_expense_id UUID;
  financial_expense_id UUID;
  investment_expense_id UUID;
  extraordinary_expense_id UUID;
  
BEGIN
  -- Get parent category IDs
  SELECT id INTO income_id FROM categories WHERE name = 'Приходи' AND type = 'income';
  SELECT id INTO expense_id FROM categories WHERE name = 'Разходи' AND type = 'expense';
  
  -- Insert second-level INCOME categories
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Оперативни приходи', 'income', income_id, 1) RETURNING id INTO operative_income_id;
  
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Финансови приходи', 'income', income_id, 2) RETURNING id INTO financial_income_id;
  
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Извънредни приходи', 'income', income_id, 3) RETURNING id INTO extraordinary_income_id;
  
  -- Insert third-level categories under "Оперативни приходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Продажби на стоки', 'income', operative_income_id, 1),
  ('Продажби на услуги', 'income', operative_income_id, 2),
  ('Приходи от абонаменти', 'income', operative_income_id, 3),
  ('Комисиони и посредничество', 'income', operative_income_id, 4),
  ('Приходи от наеми', 'income', operative_income_id, 5),
  ('Приходи от транспорт / логистика', 'income', operative_income_id, 6),
  ('Други оперативни приходи', 'income', operative_income_id, 7);
  
  -- Insert third-level categories under "Финансови приходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Получени лихви', 'income', financial_income_id, 1),
  ('Получени дивиденти', 'income', financial_income_id, 2),
  ('Приходи от валутни курсови разлики', 'income', financial_income_id, 3),
  ('Приходи от инвестиции / ценни книжа', 'income', financial_income_id, 4);
  
  -- Insert third-level categories under "Извънредни приходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Продажба на дълготрайни активи', 'income', extraordinary_income_id, 1),
  ('Обезщетения от застраховки', 'income', extraordinary_income_id, 2),
  ('Дарения и компенсации', 'income', extraordinary_income_id, 3),
  ('Възстановени разходи', 'income', extraordinary_income_id, 4);
  
  -- Insert second-level EXPENSE categories
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Оперативни разходи', 'expense', expense_id, 1) RETURNING id INTO operative_expense_id;
  
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Финансови разходи', 'expense', expense_id, 2) RETURNING id INTO financial_expense_id;
  
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Инвестиционни разходи', 'expense', expense_id, 3) RETURNING id INTO investment_expense_id;
  
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Извънредни разходи', 'expense', expense_id, 4) RETURNING id INTO extraordinary_expense_id;
  
  -- Insert third-level categories under "Оперативни разходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Материали и суровини', 'expense', operative_expense_id, 1),
  ('Консумативи и офис материали', 'expense', operative_expense_id, 2),
  ('Горива и енергия', 'expense', operative_expense_id, 3);
  
  -- Insert "Външни услуги" as a sub-category under "Оперативни разходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Външни услуги', 'expense', operative_expense_id, 4) RETURNING id INTO external_services_id;
  
  -- Insert categories under "Външни услуги"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Транспортни услуги', 'expense', external_services_id, 1),
  ('Куриерски услуги', 'expense', external_services_id, 2),
  ('Интернет, телефония, хостинг', 'expense', external_services_id, 3),
  ('Счетоводни и юридически услуги', 'expense', external_services_id, 4),
  ('Реклама и маркетинг', 'expense', external_services_id, 5),
  ('Поддръжка и сервиз', 'expense', external_services_id, 6),
  ('Почистване и охрана', 'expense', external_services_id, 7);
  
  -- Insert "Разходи за труд" as a sub-category under "Оперативни разходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Разходи за труд', 'expense', operative_expense_id, 5) RETURNING id INTO labor_expense_id;
  
  -- Insert categories under "Разходи за труд"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Заплати', 'expense', labor_expense_id, 1),
  ('Осигуровки', 'expense', labor_expense_id, 2),
  ('Бонуси и премии', 'expense', labor_expense_id, 3),
  ('Граждански договори', 'expense', labor_expense_id, 4),
  ('Обучения и курсове', 'expense', labor_expense_id, 5);
  
  -- Continue with remaining categories under "Оперативни разходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Амортизации', 'expense', operative_expense_id, 6),
  ('Представителни и пътни разходи', 'expense', operative_expense_id, 7),
  ('Такси към държавни институции', 'expense', operative_expense_id, 8);
  
  -- Insert third-level categories under "Финансови разходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Лихви по кредити', 'expense', financial_expense_id, 1),
  ('Лихви по лизинг', 'expense', financial_expense_id, 2),
  ('Банкови такси и комисиони', 'expense', financial_expense_id, 3),
  ('Загуби от валутни курсове', 'expense', financial_expense_id, 4),
  ('Разходи по гаранции, факторинг и др.', 'expense', financial_expense_id, 5),
  ('Загуби от инвестиции', 'expense', financial_expense_id, 6);
  
  -- Insert third-level categories under "Инвестиционни разходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Покупка на машини, автомобили, техника', 'expense', investment_expense_id, 1),
  ('Покупка на софтуер, лицензи', 'expense', investment_expense_id, 2),
  ('Покупка на недвижими имоти', 'expense', investment_expense_id, 3),
  ('Подобрения и ремонти на активи', 'expense', investment_expense_id, 4);
  
  -- Insert third-level categories under "Извънредни разходи"
  INSERT INTO categories (name, type, parent_id, order_index) VALUES
  ('Глоби и санкции', 'expense', extraordinary_expense_id, 1),
  ('Дарения (неприспадаеми)', 'expense', extraordinary_expense_id, 2),
  ('Съдебни и адвокатски разходи', 'expense', extraordinary_expense_id, 3),
  ('Загуби от бедствия / аварии', 'expense', extraordinary_expense_id, 4);
  
END $$;
