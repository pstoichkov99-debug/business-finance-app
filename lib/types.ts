export type Account = {
  id: string
  name: string
  type: "bank" | "credit_card" | "cash"
  initial_balance: number
  current_balance: number
  currency: string
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  name: string
  type?: "income" | "expense" // Added type field for income/expense categorization
  parent_id: string | null
  order_index: number
  created_at: string
}

export type Transaction = {
  id: string
  transaction_date: string
  pl_date: string
  account_id: string
  type: "income" | "expense" | "transfer"
  category_id: string | null
  debt_id: string | null
  project_id: string | null
  to_account_id: string | null
  amount_with_vat: number | null
  amount_without_vat: number | null
  vat_amount: number | null
  k2_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Debt = {
  id: string
  name: string
  initial_amount: number
  current_amount: number
  interest_rate: number | null
  currency: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Asset = {
  id: string
  name: string
  type: string
  value: number
  currency: string
  purchase_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  name: string
  description: string | null
  budget: number | null
  status: "active" | "completed" | "on_hold"
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export type Budget = {
  id: string
  category_id: string
  project_id: string | null
  month: string
  k1_with_vat: number | null
  k1_without_vat: number | null
  vat: number | null
  k2: number | null
  total_without_vat: number | null
  total_with_vat: number | null
  created_at: string
  updated_at: string
}

export type CashFlowSchedule = {
  id: string
  user_id: string
  project_id: string
  category_id: string
  budgeted_amount: number
  actual_amount: number
  remaining_amount: number
  scheduled_month: string
  scheduled_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}
