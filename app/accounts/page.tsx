import { createClient } from "@/lib/supabase/server"
import { AccountsList } from "@/components/accounts-list"
import { AddAccountDialog } from "@/components/add-account-dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Account, Transaction } from "@/lib/types"

export default async function AccountsPage() {
  const supabase = await createClient()

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: transactions, error: transactionsError } = await supabase.from("transactions").select("*")

  if (accountsError) {
    console.error("Error fetching accounts:", accountsError)
  }

  if (transactionsError) {
    console.error("Error fetching transactions:", transactionsError)
  }

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

    return {
      ...account,
      current_balance: calculatedBalance,
    }
  })

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
              <h1 className="text-3xl font-bold">Accounts</h1>
              <p className="text-muted-foreground">Manage your bank accounts, credit cards, and cash</p>
            </div>
          </div>
          <AddAccountDialog />
        </div>

        <AccountsList accounts={accountsWithCalculatedBalances} />
      </div>
    </div>
  )
}
