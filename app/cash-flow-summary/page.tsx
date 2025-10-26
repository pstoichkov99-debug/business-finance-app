"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CashFlowSummaryTable } from "@/components/cash-flow-summary-table"
import { ProjectCashFlowPlanning } from "@/components/project-cash-flow-planning"
import type { Account, Transaction, Project, Category, Budget, CashFlowSchedule } from "@/lib/types"

export default function CashFlowSummaryPage() {
  const [currentBalance, setCurrentBalance] = useState(0)
  const [schedules, setSchedules] = useState<
    (CashFlowSchedule & { categories: Category; projects: { name: string } })[]
  >([])
  const [categories, setCategories] = useState<Category[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const supabase = createBrowserClient()

    const [accountsRes, transactionsRes, schedulesRes, categoriesRes, projectsRes, budgetsRes] = await Promise.all([
      supabase.from("accounts").select("*"),
      supabase.from("transactions").select("*"),
      fetch("/api/cash-flow-schedule").then((r) => r.json()),
      supabase.from("categories").select("*").order("order_index"),
      supabase.from("projects").select("*").eq("status", "active").order("name"),
      supabase.from("budgets").select("*"),
    ])

    const accounts = accountsRes.data || []
    const trans = transactionsRes.data || []

    const accountsWithCalculatedBalances = accounts.map((account: Account) => {
      const accountTransactions = trans.filter(
        (t: Transaction) => t.account_id === account.id || t.to_account_id === account.id,
      )

      let calculatedBalance = account.initial_balance

      accountTransactions.forEach((transaction: Transaction) => {
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
    })

    const balance = accountsWithCalculatedBalances.reduce((sum, balance) => sum + balance, 0)

    setCurrentBalance(balance)
    setSchedules(Array.isArray(schedulesRes) ? schedulesRes : [])
    setCategories(categoriesRes.data || [])
    setProjects(projectsRes.data || [])
    setBudgets(budgetsRes.data || [])
    setTransactions(trans)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleDataChange() {
    fetchData()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Зареждане...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Planning</h1>
          <p className="text-muted-foreground">Plan payment schedules for all projects</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Current Available Cash</p>
          <p className="text-4xl font-bold">{currentBalance.toFixed(2)} BGN</p>
        </div>
      </div>

      <ProjectCashFlowPlanning
        projects={projects}
        categories={categories}
        budgets={budgets}
        transactions={transactions}
        existingSchedules={schedules}
        onDataChange={handleDataChange}
      />

      <CashFlowSummaryTable currentBalance={currentBalance} schedules={schedules} categories={categories} />
    </div>
  )
}
