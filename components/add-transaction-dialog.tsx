"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Account, Category, Debt, Project } from "@/lib/types"

interface AddTransactionDialogProps {
  accounts: Account[]
  categories: Category[]
  debts: Debt[]
  projects: Project[]
  onTransactionAdded?: () => void
}

export function AddTransactionDialog({
  accounts,
  categories,
  debts,
  projects,
  onTransactionAdded,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split("T")[0],
    pl_date: new Date().toISOString().split("T")[0],
    account_id: "",
    type: "expense",
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
  const router = useRouter()

  const childCategories = categories.filter((c) => c.parent_id !== null)
  const incomeCategories = childCategories.filter((c) => {
    const parent = categories.find((p) => p.id === c.parent_id)
    return parent?.type === "income" || !parent?.type
  })
  const expenseCategories = childCategories.filter((c) => {
    const parent = categories.find((p) => p.id === c.parent_id)
    return parent?.type === "expense"
  })

  const handleAmountWithVatChange = (value: string) => {
    const withVat = Number.parseFloat(value) || 0
    const withoutVat = withVat / 1.2
    const vat = withVat - withoutVat

    setFormData({
      ...formData,
      amount_with_vat: value,
      amount_without_vat: withoutVat.toFixed(2),
      vat_amount: vat.toFixed(2),
    })
  }

  const handleAmountWithoutVatChange = (value: string) => {
    setFormData({
      ...formData,
      amount_without_vat: value,
      amount_with_vat: "",
      vat_amount: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    console.log("[v0] Starting transaction creation, account_id:", formData.account_id)

    const { data: account, error: accountFetchError } = await supabase
      .from("accounts")
      .select("current_balance, initial_balance")
      .eq("id", formData.account_id)
      .single()

    console.log("[v0] Account data:", account, "Error:", accountFetchError)

    if (accountFetchError) {
      alert("Error fetching account: " + (accountFetchError?.message || "Unknown error"))
      setLoading(false)
      return
    }

    if (account && account.current_balance === null) {
      console.log("[v0] Account has NULL balance, fixing...")
      const balanceToSet = account.initial_balance ?? 0
      console.log("[v0] Setting balance to:", balanceToSet)

      const { error: updateError } = await supabase
        .from("accounts")
        .update({ current_balance: balanceToSet })
        .eq("id", formData.account_id)

      if (updateError) {
        console.log("[v0] Error updating account balance:", updateError)
        alert("Error updating account balance: " + (updateError?.message || "Unknown error"))
        setLoading(false)
        return
      }

      console.log("[v0] Account balance updated successfully")
    }

    if (formData.type === "transfer" && formData.to_account_id) {
      const { data: toAccount, error: toAccountFetchError } = await supabase
        .from("accounts")
        .select("current_balance, initial_balance")
        .eq("id", formData.to_account_id)
        .single()

      console.log("[v0] Destination account data:", toAccount, "Error:", toAccountFetchError)

      if (toAccountFetchError) {
        alert("Error fetching destination account: " + (toAccountFetchError?.message || "Unknown error"))
        setLoading(false)
        return
      }

      if (toAccount && toAccount.current_balance === null) {
        console.log("[v0] Destination account has NULL balance, fixing...")
        const balanceToSet = toAccount.initial_balance ?? 0
        console.log("[v0] Setting destination balance to:", balanceToSet)

        const { error: updateError } = await supabase
          .from("accounts")
          .update({ current_balance: balanceToSet })
          .eq("id", formData.to_account_id)

        if (updateError) {
          console.log("[v0] Error updating destination account balance:", updateError)
          alert("Error updating destination account balance: " + (updateError?.message || "Unknown error"))
          setLoading(false)
          return
        }

        console.log("[v0] Destination account balance updated successfully")
      }
    }

    let amountWithVat = formData.amount_with_vat ? Number.parseFloat(formData.amount_with_vat) : 0
    let amountWithoutVat = formData.amount_without_vat ? Number.parseFloat(formData.amount_without_vat) : 0
    let vatAmount = formData.vat_amount ? Number.parseFloat(formData.vat_amount) : 0
    let k2Amount = formData.k2_amount ? Number.parseFloat(formData.k2_amount) : 0

    if (formData.type === "expense") {
      if (amountWithVat && amountWithVat > 0) amountWithVat = -amountWithVat
      if (amountWithoutVat && amountWithoutVat > 0) amountWithoutVat = -amountWithoutVat
      if (vatAmount && vatAmount > 0) vatAmount = -vatAmount
      if (k2Amount && k2Amount > 0) k2Amount = -k2Amount
    } else if (formData.type === "transfer") {
      if (amountWithVat && amountWithVat > 0) amountWithVat = -amountWithVat
      if (amountWithoutVat && amountWithoutVat > 0) amountWithoutVat = -amountWithoutVat
      if (vatAmount && vatAmount > 0) vatAmount = -vatAmount
      if (k2Amount && k2Amount > 0) k2Amount = -k2Amount
    }

    console.log("[v0] Transaction amounts:", { amountWithVat, amountWithoutVat, vatAmount, k2Amount })

    const transactionData: any = {
      transaction_date: formData.transaction_date,
      pl_date: formData.pl_date,
      account_id: formData.account_id,
      type: formData.type,
      category_id: formData.category_id || null,
      debt_id: formData.debt_id || null,
      project_id: formData.project_id || null,
      to_account_id: formData.type === "transfer" ? formData.to_account_id : null,
      amount_with_vat: amountWithVat,
      amount_without_vat: amountWithoutVat,
      vat_amount: vatAmount,
      k2_amount: k2Amount,
      notes: formData.notes || null,
      is_recurring: formData.is_recurring,
      recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
      recurrence_interval: formData.is_recurring ? Number.parseInt(formData.recurrence_interval) : null,
      recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : null,
    }

    console.log("[v0] Inserting transaction:", transactionData)

    const { error } = await supabase.from("transactions").insert(transactionData)

    if (error) {
      console.log("[v0] Error creating transaction:", error)
      alert("Error creating transaction: " + (error?.message || "Unknown error"))
      setLoading(false)
      return
    }

    console.log("[v0] Transaction created successfully")

    if (formData.debt_id && formData.type === "expense") {
      const amount = Math.abs(amountWithVat || amountWithoutVat || 0) + Math.abs(k2Amount || 0)
      const { data: debt } = await supabase.from("debts").select("current_amount").eq("id", formData.debt_id).single()
      if (debt) {
        await supabase
          .from("debts")
          .update({ current_amount: debt.current_amount - amount })
          .eq("id", formData.debt_id)
      }
    }

    setFormData({
      transaction_date: new Date().toISOString().split("T")[0],
      pl_date: new Date().toISOString().split("T")[0],
      account_id: "",
      type: "expense",
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

    if (onTransactionAdded) {
      console.log("[v0] Executing onTransactionAdded")
      await onTransactionAdded()
      console.log("[v0] onTransactionAdded completed")
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
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
              <Label htmlFor="pl_date">P&L Date</Label>
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
              <Select
                value={formData.account_id}
                onValueChange={(value) => setFormData({ ...formData, account_id: value })}
              >
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
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
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
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold text-green-700 bg-green-50">
                        Income Categories
                      </div>
                      {incomeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {expenseCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold text-red-700 bg-red-50 mt-1">
                        Expense Categories
                      </div>
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
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
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
                <Input
                  id="vat_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.vat_amount}
                  disabled
                />
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
                  {(
                    (Number.parseFloat(formData.amount_with_vat) || 0) + (Number.parseFloat(formData.k2_amount) || 0)
                  ).toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Total without VAT</Label>
                <div className="text-lg font-bold">
                  {(
                    (Number.parseFloat(formData.amount_without_vat) || 0) + (Number.parseFloat(formData.k2_amount) || 0)
                  ).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
