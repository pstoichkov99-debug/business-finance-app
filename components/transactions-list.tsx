"use client"

import type { Transaction, Account, Category, Debt, Project } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Pencil } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EditTransactionDialog } from "@/components/edit-transaction-dialog"

interface TransactionsListProps {
  transactions: (Transaction & { accounts?: { name: string }; categories?: { name: string } })[]
  accounts: Account[]
  categories: Category[]
  debts: Debt[]
  projects: Project[]
  onTransactionDeleted?: () => void
  onTransactionUpdated?: () => void
}

export function TransactionsList({
  transactions: initialTransactions,
  accounts,
  categories,
  debts,
  projects,
  onTransactionDeleted,
  onTransactionUpdated,
}: TransactionsListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const router = useRouter()

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowDownRight className="h-4 w-4 text-green-600" />
      case "expense":
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case "transfer":
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const formatAmount = (amount: number) => {
    return amount === 0 ? "" : amount.toFixed(2)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return

    const supabase = createClient()

    const { error } = await supabase.from("transactions").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting transaction:", error)
      alert("Error deleting transaction: " + (error?.message || "Unknown error"))
      return
    }

    setTransactions(transactions.filter((t) => t.id !== id))

    if (onTransactionDeleted) {
      onTransactionDeleted()
    }
    router.refresh()
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No transactions yet</p>
        <p className="text-sm text-muted-foreground">Add your first transaction to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg" style={{ fontFamily: "Arial, sans-serif" }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold border-r border-gray-300">Transaction Date</TableHead>
              <TableHead className="font-bold border-r border-gray-300">P&L Date</TableHead>
              <TableHead className="font-bold border-r border-gray-300">Type</TableHead>
              <TableHead className="font-bold border-r border-gray-300">Account</TableHead>
              <TableHead className="font-bold border-r border-gray-300">Category</TableHead>
              <TableHead className="text-right font-bold border-r border-gray-300">K1 without VAT</TableHead>
              <TableHead className="text-right font-bold border-r border-gray-300">VAT</TableHead>
              <TableHead className="text-right font-bold border-r border-gray-300">K1 with VAT</TableHead>
              <TableHead className="text-right font-bold border-r border-gray-300">K2</TableHead>
              <TableHead className="text-right font-bold border-r border-gray-300">Total with VAT</TableHead>
              <TableHead className="text-right font-bold border-r border-gray-300">Total without VAT</TableHead>
              <TableHead className="font-bold border-r border-gray-300">Notes</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const k1WithVat = Math.abs(transaction.amount_with_vat || 0)
              const k1WithoutVat = Math.abs(transaction.amount_without_vat || 0)
              const vat = Math.abs(transaction.vat_amount || 0)
              const k2 = Math.abs(transaction.k2_amount || 0)
              const totalWithVat = k1WithVat + k2
              const totalWithoutVat = k1WithoutVat + k2

              return (
                <TableRow key={transaction.id} className="border-b">
                  <TableCell className="border-r border-gray-300">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="border-r border-gray-300">
                    {new Date(transaction.pl_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="border-r border-gray-300">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-gray-300">{transaction.accounts?.name || "-"}</TableCell>
                  <TableCell className="border-r border-gray-300">{transaction.categories?.name || "-"}</TableCell>
                  <TableCell className="text-right border-r border-gray-300">
                    {k1WithoutVat > 0 ? k1WithoutVat.toFixed(2) : ""}
                  </TableCell>
                  <TableCell className="text-right border-r border-gray-300">{formatAmount(vat)}</TableCell>
                  <TableCell className="text-right border-r border-gray-300">{formatAmount(k1WithVat)}</TableCell>
                  <TableCell className="text-right border-r border-gray-300">{k2 > 0 ? k2.toFixed(2) : ""}</TableCell>
                  <TableCell className="text-right font-semibold border-r border-gray-300">
                    {vat > 0 ? totalWithVat.toFixed(2) : ""}
                  </TableCell>
                  <TableCell className="text-right font-semibold border-r border-gray-300">
                    {totalWithoutVat > 0 ? totalWithoutVat.toFixed(2) : ""}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate border-r border-gray-300">
                    {transaction.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditingTransaction(transaction)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(transaction.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {editingTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          accounts={accounts}
          categories={categories}
          debts={debts}
          projects={projects}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          onTransactionUpdated={onTransactionUpdated}
        />
      )}
    </>
  )
}
