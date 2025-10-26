-- Create cash_flow_schedule table for planning future payments and receipts
CREATE TABLE IF NOT EXISTS cash_flow_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Budget information
  budgeted_amount DECIMAL(15, 2) NOT NULL,
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  
  -- Scheduled payment/receipt
  scheduled_month DATE NOT NULL, -- First day of the month when payment is scheduled
  scheduled_amount DECIMAL(15, 2) NOT NULL,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cash_flow_schedule_user ON cash_flow_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_schedule_project ON cash_flow_schedule(project_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_schedule_month ON cash_flow_schedule(scheduled_month);

-- Enable RLS
ALTER TABLE cash_flow_schedule ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own cash flow schedules
CREATE POLICY "Users can manage their own cash flow schedules"
  ON cash_flow_schedule
  FOR ALL
  USING (auth.uid() = user_id);
