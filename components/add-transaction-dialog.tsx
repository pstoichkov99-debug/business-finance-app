"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Account, Category, Debt, Project } from "@/lib/types"

/** Safe number (0 за null/празно, заменя запетайка с точка) */
const num = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v)
  return Number.isFinite(n) ? n : 0
}

interface AddTransactionDialogProps {
  accounts: Account[]
  categories: Category[]
  debts: Debt[]
  projects: Project[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionCreated?: () => void
}

export function AddTransactionDialog({
  accounts,
  categories,
  debts,
  projects,
  open,
  onOpenChange,
  onTransactionCreated,
}: AddTransactionDialogProps) {
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toISOString().slice(0, 10)

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    transaction_date: today,
    pl_date: today,
    account_id: accounts[0]?.id || "",
    type: "expense" as "income" | "expense" | "transfer",
    category_id: "",
    debt_id: "",
    project_id: "",
    to_account_id: "",
    amount_with_vat: "",
    amount_without_vat: "",
    vat_amount: "",
    k2_amount: "",
    notes: "",
    is_recurring: false,
    recurrence_frequency: "monthly",
    recurrence_interval: "1",
    recurrence_end_date: "",
  })

  const childCategories = categories.filter((c) => c.parent_id !== null)
  const incomeCategories = childCategories.filter((c) => {
    const parent = categories.find((p) => p.id === c.parent_id)
    return parent?.type === "income" || !parent?.type
  })
  const expenseCategories = childCategories.filter((c) => {
    const parent = categories.find((p) => p.id === c.parent_id)
    return parent?.type === "expense"
  })

  /** K1 с ДДС → изчислява без ДДС и ДДС */
  const handleAmountWithVatChange = (value: string) => {
    const withVat = num(value)
    const withoutVat = withVat / 1.2
    const vat = withVat - withoutVat
    setFormData((prev) => ({
      ...prev,
      amount_with_vat: value,
      amount_without_vat: withVat ? withoutVat.toFixed(2) : "",
      vat_amount: withVat ? vat.toFixed(2) : "",
    }))
  }

  /** K1 без ДДС → чисти К1 с ДДС и ДДС */
  const handleAmountWithoutVatChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      amount_without_vat: value,
      amount_with_vat: "",
      vat_amount: "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // parse
    let withVat = formData.amount_with_vat ? num(formData.amount_with_vat) : 0
    let withoutVat = formData.amount_without_vat ? num(formData.amount_without_vat) : 0
    let vatAmount = formData.vat_amount ? num(formData.vat_amount) : 0
    let k2Amount = formData.k2_amount ? num(formData.k2_amount) : 0

    // знак за expense/transfer
    const isNegative = formData.type === "expense" || formData.type === "transfer"
    if (isNegative) {
      if (withVat > 0) withVat = -withVat
      if (withoutVat > 0) withoutVat = -withoutVat
      if (vatAmount > 0) vatAmount = -vatAmount
      if (k2Amount > 0) k2Amount = -k2Amount
    }

    // account_amount правило
    const accountAmount =
      Math.abs(withVat) === 0 ? withoutVat + k2Amount : withVat + k2Amount

    const payload: any = {
      transaction_date: formData.transaction_date,
      pl_date: formData.pl_date,
      account_id: formData.account_id,
      type: formData.type,
      category_id: formData.category_id || null,
      debt_id: formData.debt_id || null,
      project_id: formData.project_id || null,
      to_account_id: formData.type === "transfer" ? formData.to_account_id : null,

      amount_with_vat: withVat || null,
      amount_without_vat: withoutVat || null,
      vat_amount: vatAmount || null,
      k2_amount: k2Amount || null,

      account_amount: accountAmount,

      notes: formData.notes || null,
      is_recurring: formData.is_recurring,
      recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
      recurrence_interval: formData.is_recurring ? Number.parseInt(formData.recurrence_interval) : null,
      recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : null,
    }

    const { error } = await supabase.from("transactions").insert(payload)

    if (error) {
      alert("Error creating transaction: " + (error?.message || "Unknown error"))
      setLoading(false)
      return
    }

    onOpenChange(false)
    setLoading(false)
    if (onTransactionCreated) onTransactionCreated()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Record a new income, expense, or transfer</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Transaction Date</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pl_date">P&amp;L Date</Label>
              <Input
                id="pl_date"
                type="date"
                value={formData.pl_date}
                onChange={(e) => setFormData({ ...formData, pl_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_id">Account</Label>
              <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold text-green-700 bg-green-50">Income Categories</div>
                      {incomeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {expenseCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold text-red-700 bg-red-50 mt-1">Expense Categories</div>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.type === "expense" && (
            <div className="space-y-2">
              <Label htmlFor="debt_id">Debt Payment</Label>
              <Select value={formData.debt_id} onValueChange={(value) => setFormData({ ...formData, debt_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select debt (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {debts.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.type === "transfer" && (
            <div className="space-y-2">
              <Label htmlFor="to_account_id">To Account</Label>
              <Select
                value={formData.to_account_id}
                onValueChange={(value) => setFormData({ ...formData, to_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((acc) => acc.id !== formData.account_id)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amounts */}
          <div className="space-y-3">
            <Label>Amounts</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount_with_vat" className="text-sm font-semibold">
                  K1 with VAT
                </Label>
                <Input
                  id="amount_with_vat"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount_with_vat}
                  onChange={(e) => handleAmountWithVatChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount_without_vat" className="text-sm font-semibold">
                  K1 without VAT
                </Label>
                <Input
                  id="amount_without_vat"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount_without_vat}
                  onChange={(e) => handleAmountWithoutVatChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_amount" className="text-sm font-semibold">
                  VAT
                </Label>
                <Input id="vat_amount" type="number" step="0.01" placeholder="0.00" value={formData.vat_amount} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="k2_amount" className="text-sm font-semibold">
                  K2
                </Label>
                <Input
                  id="k2_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.k2_amount}
                  onChange={(e) => setFormData({ ...formData, k2_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Total with VAT</Label>
                <div className="text-lg font-bold">
                  {(num(formData.amount_with_vat) + num(formData.k2_amount)).toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Total without VAT</Label>
                <div className="text-lg font-bold">
                  {(num(formData.amount_without_vat) + num(formData.k2_amount)).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes / Recurrence */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
              />
              <Label htmlFor="is_recurring" className="text-sm font-medium cursor-pointer">
                Make this a recurring transaction
              </Label>
            </div>

            {formData.is_recurring && (
              <div className="space-y-3 pl-6 border-l-2 border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_frequency">Frequency</Label>
                    <Select
                      value={formData.recurrence_frequency}
                      onValueChange={(value) => setFormData({ ...formData, recurrence_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recurrence_interval">Every</Label>
                    <Input
                      id="recurrence_interval"
                      type="number"
                      min="1"
                      value={formData.recurrence_interval}
                      onChange={(e) => setFormData({ ...formData, recurrence_interval: e.target.value })}
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.recurrence_interval === "1"
                        ? `Every ${formData.recurrence_frequency === "weekly" ? "week" : formData.recurrence_frequency === "monthly" ? "month" : "year"}`
                        : `Every ${formData.recurrence_interval} ${formData.recurrence_frequency === "weekly" ? "weeks" : formData.recurrence_frequency === "monthly" ? "months" : "years"}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurrence_end_date">End Date (Optional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    min={formData.transaction_date}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for indefinite recurrence</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
