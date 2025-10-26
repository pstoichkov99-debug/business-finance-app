"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { BudgetTable } from "@/components/budget-table"
import { AddCategoryDialog } from "@/components/add-category-dialog"
import { AddExistingCategoryDialog } from "@/components/add-existing-category-dialog"
import { PeriodSelector } from "@/components/period-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import type { Account, Transaction, Category, Budget } from "@/lib/types"

type PeriodType = "monthly" | "annual" | "custom"

interface Project {
  id: string
  name: string
  status: string
  description?: string
  start_date?: string | null
  end_date?: string | null
}

export default function ProjectBudgetPage({ params }: { params: { id: string } }) {
  const [projectId, setProjectId] = useState<string>("")
  const [project, setProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const searchParams = useSearchParams()
  const periodType = (searchParams.get("periodType") as PeriodType) || "monthly"
  const period = searchParams.get("period") || getCurrentPeriod(periodType)

  useEffect(() => {
    setProjectId(params.id)
  }, [params])

  const fetchData = async () => {
    if (!projectId) return

    const { startDate, endDate, months } = getPeriodRange(periodType, period)
    const supabase = createClient()

    const [projectRes, categoriesRes, budgetsRes, transactionsRes, accountsRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase.from("categories").select("*").order("order_index"),
      supabase
        .from("budgets")
        .select("*")
        .eq("project_id", projectId)
        .in(
          "month",
          months.map((m) => m + "-01"),
        ),
      supabase
        .from("transactions")
        .select("*")
        .eq("project_id", projectId)
        .gte("pl_date", startDate)
        .lt("pl_date", endDate),
      supabase.from("accounts").select("*"),
    ])

    setProject(projectRes.data)
    setCategories(categoriesRes.data || [])
    setBudgets(budgetsRes.data || [])
    setTransactions(transactionsRes.data || [])
    setAccounts(accountsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [projectId, periodType, period])

  const calculateAccountBalance = (account: Account): number => {
    const accountTransactions = transactions.filter(
      (t) => t.account_id === account.id || t.to_account_id === account.id,
    )

    let calculatedBalance = account.initial_balance

    accountTransactions.forEach((transaction) => {
      const transactionTotal =
        (transaction.amount_with_vat || transaction.amount_without_vat || 0) + (transaction.k2_amount || 0)

      if (transaction.account_id === account.id) {
        calculatedBalance += transactionTotal
      }

      if (transaction.to_account_id === account.id && transaction.type === "transfer") {
        calculatedBalance += Math.abs(transactionTotal)
      }
    })

    return calculatedBalance
  }

  const totalAvailableToday = accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc), 0)

  const { months } = getPeriodRange(periodType, period)
  const aggregatedBudgets = periodType === "monthly" ? aggregateBudgetsByCategory(budgets, categories) : budgets

  const incomeCategories = categories.filter((c) => c.type === "income")
  const expenseCategories = categories.filter((c) => c.type === "expense")

  const incomeBudgetTotal = aggregatedBudgets
    .filter((b) => incomeCategories.some((c) => c.id === b.category_id))
    .reduce((sum, b) => sum + (b.total_with_vat || 0), 0)

  const expenseBudgetTotal = aggregatedBudgets
    .filter((b) => expenseCategories.some((c) => c.id === b.category_id))
    .reduce((sum, b) => sum + (b.total_with_vat || 0), 0)

  const incomeActualTotal = transactions
    .filter((t) => incomeCategories.some((c) => c.id === t.category_id))
    .reduce((sum, t) => sum + Math.abs(t.amount_with_vat || 0) + Math.abs(t.k2_amount || 0), 0)

  const expenseActualTotal = transactions
    .filter((t) => expenseCategories.some((c) => c.id === t.category_id))
    .reduce((sum, t) => sum + Math.abs(t.amount_with_vat || 0) + Math.abs(t.k2_amount || 0), 0)

  const expectedIncomeRemaining = incomeBudgetTotal - incomeActualTotal
  const expectedExpenseRemaining = expenseBudgetTotal - expenseActualTotal

  const availableAtEndOfMonth = totalAvailableToday + expectedIncomeRemaining - expectedExpenseRemaining

  const incomeVAT = aggregatedBudgets
    .filter((b) => incomeCategories.some((c) => c.id === b.category_id))
    .reduce((sum, b) => sum + (b.vat || 0), 0)

  const expenseVAT = aggregatedBudgets
    .filter((b) => expenseCategories.some((c) => c.id === b.category_id))
    .reduce((sum, b) => sum + (b.vat || 0), 0)

  const vatToPay = incomeVAT - expenseVAT

  const handleBudgetUpdate = () => {
    console.log("[v0] handleBudgetUpdate called - refreshing data")
    fetchData()
  }

  const handleCategoryAdded = () => {
    console.log("[v0] handleCategoryAdded called - refreshing data")
    fetchData()
  }

  const existingBudgetCategoryIds = budgets.map((b) => b.category_id)

  const periodLabel = getPeriodLabel(periodType, period)

  const categoriesWithBudgets = categories.filter((c) => budgets.some((b) => b.category_id === c.id))

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
              <div>
                <h3 className="font-bold text-lg mb-2">Available Money Today</h3>
                <p className="text-2xl font-bold text-blue-600">{totalAvailableToday.toFixed(2)} BGN</p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Available Money at End of Period</h3>
                <p className={`text-2xl font-bold ${availableAtEndOfMonth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {availableAtEndOfMonth.toFixed(2)} BGN
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Today: {totalAvailableToday.toFixed(2)} + Expected income:{" "}
                  <span className="text-green-600">{expectedIncomeRemaining.toFixed(2)}</span> - Expected expenses:{" "}
                  <span className="text-red-600">{expectedExpenseRemaining.toFixed(2)}</span>
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">VAT to Pay</h3>
                <p className="text-2xl font-bold text-orange-600">{vatToPay.toFixed(2)} BGN</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Income VAT: {incomeVAT.toFixed(2)} - Expense VAT: {expenseVAT.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <Badge
                  className={
                    project.status === "active"
                      ? "bg-green-100 text-green-800"
                      : project.status === "completed"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">{periodLabel} Budget</p>
            </div>
          </div>
          <div className="flex gap-2">
            <AddExistingCategoryDialog
              categories={categories}
              existingBudgetCategoryIds={existingBudgetCategoryIds}
              projectId={projectId}
              selectedMonth={period}
              onCategoriesAdded={handleBudgetUpdate}
            />
            <AddCategoryDialog onCategoryAdded={handleCategoryAdded} />
            <PeriodSelector />
          </div>
        </div>

        <BudgetTable
          categories={categoriesWithBudgets}
          budgets={aggregatedBudgets}
          transactions={transactions}
          selectedMonth={period}
          accounts={accounts}
          onBudgetUpdate={handleBudgetUpdate}
          readOnly={false}
          projectId={projectId}
          months={months}
          allBudgets={budgets}
        />
      </div>
    </div>
  )
}

function aggregateBudgetsByCategory(budgets: any[], categories: any[]): any[] {
  const aggregated: { [key: string]: any } = {}

  for (const budget of budgets) {
    const key = budget.category_id

    if (!aggregated[key]) {
      aggregated[key] = {
        id: budget.id,
        category_id: budget.category_id,
        k1_with_vat: 0,
        k1_without_vat: 0,
        vat: 0,
        k2: 0,
        total_without_vat: 0,
        total_with_vat: 0,
        actual_without_vat: 0,
        actual_with_vat: 0,
      }
    }

    aggregated[key].k1_with_vat += budget.k1_with_vat || 0
    aggregated[key].k1_without_vat += budget.k1_without_vat || 0
    aggregated[key].vat += budget.vat || 0
    aggregated[key].k2 += budget.k2 || 0
    aggregated[key].total_without_vat += budget.total_without_vat || 0
    aggregated[key].total_with_vat += budget.total_with_vat || 0
    aggregated[key].actual_without_vat += budget.actual_without_vat || 0
    aggregated[key].actual_with_vat += budget.actual_with_vat || 0
  }

  return Object.values(aggregated)
}

function getCurrentPeriod(type: PeriodType): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  if (type === "monthly") {
    return `${year}-${String(month).padStart(2, "0")}`
  } else if (type === "custom") {
    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    return `${startOfMonth}_${endOfMonth}`
  } else {
    return String(year)
  }
}

function getPeriodRange(type: PeriodType, period: string): { startDate: string; endDate: string; months: string[] } {
  if (type === "custom") {
    const [startDate, endDate] = period.split("_")
    const months: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    const current = new Date(start.getFullYear(), start.getMonth(), 1)
    while (current <= end) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`)
      current.setMonth(current.getMonth() + 1)
    }

    const nextDay = new Date(end)
    nextDay.setDate(nextDay.getDate() + 1)
    const endDateExclusive = nextDay.toISOString().slice(0, 10)

    return { startDate, endDate: endDateExclusive, months }
  }

  if (type === "monthly") {
    const startDate = period + "-01"
    const endDate = getNextMonth(period)
    return { startDate, endDate, months: [period] }
  } else {
    // Annual
    const year = period
    const months = []

    for (let month = 1; month <= 12; month++) {
      months.push(`${year}-${String(month).padStart(2, "0")}`)
    }

    const startDate = `${year}-01-01`
    const endDate = `${Number.parseInt(year) + 1}-01-01`

    return { startDate, endDate, months }
  }
}

function getPeriodLabel(type: PeriodType, period: string): string {
  if (type === "monthly") {
    return "Monthly"
  } else if (type === "custom") {
    const [startDate, endDate] = period.split("_")
    return `Custom (${startDate} to ${endDate})`
  } else {
    return "Annual"
  }
}

function getNextMonth(month: string): string {
  const date = new Date(month + "-01")
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 7) + "-01"
}
