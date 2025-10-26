"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { TransactionsList } from "@/components/transactions-list"
import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Transaction, Account, Category, Debt, Project } from "@/lib/types"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<
    (Transaction & { accounts?: { name: string }; categories?: { name: string } })[]
  >([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const supabase = createClient()

    const [
      { data: transactionsData },
      { data: accountsData },
      { data: categoriesData },
      { data: debtsData },
      { data: projectsData },
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, accounts!transactions_account_id_fkey(name), categories(name)")
        .order("transaction_date", { ascending: false }),
      supabase.from("accounts").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
      supabase.from("debts").select("*").order("name"),
      supabase.from("projects").select("*").order("name"),
    ])

    setTransactions(transactionsData || [])
    setAccounts(accountsData || [])
    setCategories(categoriesData || [])
    setDebts(debtsData || [])
    setProjects(projectsData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleTransactionAdded = async () => {
    console.log("[v0] handleTransactionAdded called, fetching data...")
    await fetchData()
    console.log("[v0] Data fetched successfully")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Transactions</h1>
              <p className="text-muted-foreground">Record income, expenses, and transfers</p>
            </div>
          </div>
          <AddTransactionDialog
            accounts={accounts}
            categories={categories}
            debts={debts}
            projects={projects}
            onTransactionAdded={handleTransactionAdded}
          />
        </div>

        <TransactionsList
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          debts={debts}
          projects={projects}
          onTransactionDeleted={handleTransactionAdded}
          onTransactionUpdated={handleTransactionAdded}
        />
      </div>
    </div>
  )
}
