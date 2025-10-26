"use client"

import type { Debt } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, CreditCard } from "lucide-react"
import { EditDebtDialog } from "@/components/edit-debt-dialog"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DebtsListProps {
  debts: Debt[]
}

export function DebtsList({ debts: initialDebts }: DebtsListProps) {
  const [debts, setDebts] = useState(initialDebts)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this debt?")) return

    const supabase = createClient()
    const { error } = await supabase.from("debts").delete().eq("id", id)

    if (error) {
      alert("Error deleting debt: " + (error?.message || "Unknown error"))
      return
    }

    setDebts(debts.filter((debt) => debt.id !== id))
    router.refresh()
  }

  if (debts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No debts tracked</p>
        <p className="text-sm text-muted-foreground">Add your first debt to start tracking</p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Debt Name</TableHead>
              <TableHead className="text-right">Initial Amount</TableHead>
              <TableHead className="text-right">Current Amount</TableHead>
              <TableHead className="text-right">Paid Off</TableHead>
              <TableHead className="text-right">Interest Rate</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => {
              const paidAmount = debt.initial_amount - debt.current_amount
              const paidPercentage = ((paidAmount / debt.initial_amount) * 100).toFixed(1)

              return (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {debt.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{debt.initial_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {debt.current_amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {paidAmount.toFixed(2)} ({paidPercentage}%)
                  </TableCell>
                  <TableCell className="text-right">{debt.interest_rate ? `${debt.interest_rate}%` : "-"}</TableCell>
                  <TableCell>{debt.currency}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{debt.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingDebt(debt)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(debt.id)}>
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

      {editingDebt && (
        <EditDebtDialog
          debt={editingDebt}
          open={!!editingDebt}
          onOpenChange={(open) => !open && setEditingDebt(null)}
          onSuccess={() => {
            setEditingDebt(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
