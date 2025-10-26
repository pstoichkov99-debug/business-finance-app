import { createClient } from "@/lib/supabase/server"
import { ForecastChart } from "@/components/forecast-chart"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Account, Transaction } from "@/lib/types"

export default async function ForecastPage() {
  const supabase = await createClient()

  // Get accounts and transactions
  const { data: accounts } = await supabase.from("accounts").select("*")
  const { data: transactions } = await supabase.from("transactions").select("*")

  const accountsWithCalculatedBalances = (accounts || []).map((account: Account) => {
    const accountTransactions = (transactions || []).filter(
      (t: Transaction) => t.account_id === account.id || t.to_account_id === account.id,
    )

    let calculatedBalance = account.initial_balance

    accountTransactions.forEach((transaction: Transaction) => {
      const transactionTotal =
        (transaction.amount_with_vat || transaction.amount_without_vat || 0) + (transaction.k2_amount || 0)

      if (transaction.account_id === account.id) {
        // This account is the source
        calculatedBalance += transactionTotal // transactionTotal is already negative for expenses
      }

      if (transaction.to_account_id === account.id && transaction.type === "transfer") {
        // This account is the destination of a transfer
        calculatedBalance += Math.abs(transactionTotal) // Add the positive amount
      }
    })

    return calculatedBalance
  })

  const currentBalance = accountsWithCalculatedBalances.reduce((sum, balance) => sum + balance, 0)

  // Get all recurring transactions
  const { data: recurringTransactions } = await supabase
    .from("transactions")
    .select("*, categories(*)")
    .eq("is_recurring", true)
    .is("parent_transaction_id", null)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Forecast</h1>
          <p className="text-muted-foreground">Project your future cash flow based on recurring transactions</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Current Total Balance</p>
          <p className="text-4xl font-bold">{currentBalance.toFixed(2)} BGN</p>
        </div>
      </div>

      <ForecastChart currentBalance={currentBalance} recurringTransactions={recurringTransactions || []} />
    </div>
  )
}
