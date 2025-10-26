"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import type { Category, Budget, Transaction } from "@/lib/types"

interface CashFlowSchedule {
  id: string
  project_id: string
  category_id: string
  budgeted_amount: number
  actual_amount: number
  remaining_amount: number
  scheduled_month: string
  scheduled_amount: number
  notes?: string
}

interface ProjectCashFlowTableProps {
  projectId: string
  categories: Category[]
  budgets: Budget[]
  transactions: Transaction[]
  schedules: CashFlowSchedule[]
}

export function ProjectCashFlowTable({
  projectId,
  categories,
  budgets,
  transactions,
  schedules: initialSchedules,
}: ProjectCashFlowTableProps) {
  const [schedules, setSchedules] = useState<CashFlowSchedule[]>(initialSchedules)

  // Calculate budgeted, actual, and remaining for each category
  const categoryData = categories.map((category) => {
    const categoryBudgets = budgets.filter((b) => b.category_id === category.id)
    const budgetedAmount = categoryBudgets.reduce((sum, b) => sum + (b.amount_with_vat || b.amount_without_vat || 0), 0)

    const categoryTransactions = transactions.filter((t) => t.category_id === category.id)
    const actualAmount = categoryTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount_with_vat || t.amount_without_vat || 0),
      0,
    )

    const remainingAmount = budgetedAmount - actualAmount

    const categorySchedules = schedules.filter((s) => s.category_id === category.id)

    return {
      category,
      budgetedAmount,
      actualAmount,
      remainingAmount,
      schedules: categorySchedules,
    }
  })

  // Filter to only show categories with remaining amounts
  const categoriesWithRemaining = categoryData.filter((cd) => cd.remainingAmount !== 0)

  // Group by parent categories
  const parentCategories = categoriesWithRemaining.filter((cd) => !cd.category.parent_id)
  const childCategoriesByParent = new Map<string, typeof categoriesWithRemaining>()

  categoriesWithRemaining.forEach((cd) => {
    if (cd.category.parent_id) {
      const existing = childCategoriesByParent.get(cd.category.parent_id) || []
      childCategoriesByParent.set(cd.category.parent_id, [...existing, cd])
    }
  })

  async function addSchedule(categoryId: string, remainingAmount: number) {
    const response = await fetch("/api/cash-flow-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        category_id: categoryId,
        scheduled_amount: remainingAmount,
        scheduled_month: new Date().toISOString().slice(0, 7) + "-01",
      }),
    })

    if (response.ok) {
      const newSchedule = await response.json()
      setSchedules([...schedules, newSchedule])
    }
  }

  async function updateSchedule(scheduleId: string, field: string, value: string | number) {
    const response = await fetch("/api/cash-flow-schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: scheduleId,
        [field]: value,
      }),
    })

    if (response.ok) {
      const updated = await response.json()
      setSchedules(schedules.map((s) => (s.id === scheduleId ? updated : s)))
    }
  }

  async function deleteSchedule(scheduleId: string) {
    const response = await fetch("/api/cash-flow-schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: scheduleId }),
    })

    if (response.ok) {
      setSchedules(schedules.filter((s) => s.id !== scheduleId))
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Plan Payments and Receipts</h2>
          <p className="text-sm text-muted-foreground mb-6">
            For each category with remaining budget, schedule when you will pay or receive the money.
          </p>

          <div className="space-y-6">
            {parentCategories.map((parentData) => {
              const children = childCategoriesByParent.get(parentData.category.id) || []
              const hasChildren = children.length > 0

              return (
                <div key={parentData.category.id} className="space-y-2">
                  {/* Parent Category */}
                  <div className="font-semibold text-lg bg-gray-50 p-3 rounded">{parentData.category.name}</div>

                  {/* Child Categories */}
                  {hasChildren &&
                    children.map((childData) => (
                      <div key={childData.category.id} className="ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{childData.category.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Budgeted: {childData.budgetedAmount.toFixed(2)} | Actual:{" "}
                              {childData.actualAmount.toFixed(2)} | Remaining:{" "}
                              <span className="font-semibold">{childData.remainingAmount.toFixed(2)}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addSchedule(childData.category.id, childData.remainingAmount)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Payment
                          </Button>
                        </div>

                        {/* Schedules for this category */}
                        {childData.schedules.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {childData.schedules.map((schedule) => (
                              <div key={schedule.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                <Input
                                  type="month"
                                  value={schedule.scheduled_month.slice(0, 7)}
                                  onChange={(e) =>
                                    updateSchedule(schedule.id, "scheduled_month", e.target.value + "-01")
                                  }
                                  className="w-40"
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={schedule.scheduled_amount}
                                  onChange={(e) =>
                                    updateSchedule(schedule.id, "scheduled_amount", Number.parseFloat(e.target.value))
                                  }
                                  className="w-32"
                                />
                                <Button size="icon" variant="ghost" onClick={() => deleteSchedule(schedule.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* If parent has no children, show parent directly */}
                  {!hasChildren && parentData.remainingAmount !== 0 && (
                    <div className="ml-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-muted-foreground">
                            Budgeted: {parentData.budgetedAmount.toFixed(2)} | Actual:{" "}
                            {parentData.actualAmount.toFixed(2)} | Remaining:{" "}
                            <span className="font-semibold">{parentData.remainingAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addSchedule(parentData.category.id, parentData.remainingAmount)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Payment
                        </Button>
                      </div>

                      {parentData.schedules.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {parentData.schedules.map((schedule) => (
                            <div key={schedule.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                              <Input
                                type="month"
                                value={schedule.scheduled_month.slice(0, 7)}
                                onChange={(e) => updateSchedule(schedule.id, "scheduled_month", e.target.value + "-01")}
                                className="w-40"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={schedule.scheduled_amount}
                                onChange={(e) =>
                                  updateSchedule(schedule.id, "scheduled_amount", Number.parseFloat(e.target.value))
                                }
                                className="w-32"
                              />
                              <Button size="icon" variant="ghost" onClick={() => deleteSchedule(schedule.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
