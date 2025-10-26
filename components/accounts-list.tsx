"use client"

import type { Account } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Wallet, CreditCard, Banknote, PiggyBank } from "lucide-react"
import { EditAccountDialog } from "@/components/edit-account-dialog"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AccountsListProps {
  accounts: Account[]
}

export function AccountsList({ accounts: initialAccounts }: AccountsListProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const router = useRouter()

  const paymentBankAccounts = accounts.filter(
    (a) => (a.account_type === "payment" || !a.account_type) && (a.account_location === "bank" || a.type === "bank"),
  )
  const paymentCashAccounts = accounts.filter(
    (a) => (a.account_type === "payment" || !a.account_type) && (a.account_location === "cash" || a.type === "cash"),
  )
  const savingsAccounts = accounts.filter((a) => a.account_type === "savings")
  const creditAccounts = accounts.filter((a) => a.account_type === "credit" || a.type === "credit_card")

  const getSubtotal = (accountsList: Account[]) => {
    return accountsList.reduce((sum, acc) => sum + acc.current_balance, 0)
  }

  const grandTotal = accounts.reduce((sum, acc) => sum + acc.current_balance, 0)

  const getAccountIcon = (accountType: string, accountLocation: string) => {
    if (accountType === "credit") return <CreditCard className="h-4 w-4" />
    if (accountType === "savings") return <PiggyBank className="h-4 w-4" />
    if (accountLocation === "cash") return <Banknote className="h-4 w-4" />
    return <Wallet className="h-4 w-4" />
  }

  const getAccountTypeLabel = (accountType: string, accountLocation: string) => {
    if (accountType === "credit") return "Credit"
    if (accountType === "savings") return "Savings"
    if (accountType === "payment" && accountLocation === "bank") return "Payment - Bank"
    if (accountType === "payment" && accountLocation === "cash") return "Payment - Cash"
    if (!accountType && accountLocation === "bank") return "Payment - Bank"
    if (!accountType && accountLocation === "cash") return "Payment - Cash"
    return "Unknown"
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return

    const supabase = createClient()
    const { error } = await supabase.from("accounts").delete().eq("id", id)

    if (error) {
      alert("Error deleting account: " + (error?.message || "Unknown error"))
      return
    }

    setAccounts(accounts.filter((acc) => acc.id !== id))
    router.refresh()
  }

  const renderAccountRows = (accountsList: Account[]) => {
    return accountsList.map((account) => (
      <TableRow key={account.id}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {getAccountIcon(account.account_type, account.account_location)}
            {account.name}
          </div>
        </TableCell>
        <TableCell>{getAccountTypeLabel(account.account_type, account.account_location)}</TableCell>
        <TableCell className="text-right">{account.initial_balance.toFixed(2)}</TableCell>
        <TableCell className="text-right font-semibold">{account.current_balance.toFixed(2)}</TableCell>
        <TableCell>{account.currency}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => setEditingAccount(account)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No accounts yet</p>
        <p className="text-sm text-muted-foreground">Add your first account to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Initial Balance</TableHead>
              <TableHead className="text-right">Current Balance</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentBankAccounts.length > 0 && (
              <>
                {renderAccountRows(paymentBankAccounts)}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Subtotal: Payment Bank</TableCell>
                  <TableCell className="text-right">{getSubtotal(paymentBankAccounts).toFixed(2)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}

            {paymentCashAccounts.length > 0 && (
              <>
                {renderAccountRows(paymentCashAccounts)}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Subtotal: Payment Cash</TableCell>
                  <TableCell className="text-right">{getSubtotal(paymentCashAccounts).toFixed(2)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}

            {savingsAccounts.length > 0 && (
              <>
                {renderAccountRows(savingsAccounts)}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Subtotal: Savings</TableCell>
                  <TableCell className="text-right">{getSubtotal(savingsAccounts).toFixed(2)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}

            {creditAccounts.length > 0 && (
              <>
                {renderAccountRows(creditAccounts)}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={3}>Subtotal: Credit</TableCell>
                  <TableCell className="text-right">{getSubtotal(creditAccounts).toFixed(2)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}

            <TableRow className="bg-primary/10 font-bold border-t-2">
              <TableCell colSpan={3}>TOTAL: Available Funds</TableCell>
              <TableCell className="text-right text-lg">{grandTotal.toFixed(2)}</TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          onSuccess={() => {
            setEditingAccount(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
