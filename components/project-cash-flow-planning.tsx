"use client"

import { useState } from "react"
import type { Project, Category, Budget, Transaction, CashFlowSchedule } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ProjectCashFlowPlanningProps {
  projects: Project[]
  categories: Category[]
  budgets: Budget[]
  transactions: Transaction[]
  existingSchedules: (CashFlowSchedule & { categories: Category; projects: { name: string } })[]
  onDataChange: () => void
}

export function ProjectCashFlowPlanning({
  projects,
  categories,
  budgets,
  transactions,
  existingSchedules,
  onDataChange,
}: ProjectCashFlowPlanningProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [newSchedules, setNewSchedules] = useState<
    Map<string, { month: string; amount: string; installments: string }>
  >(new Map())

  function toggleProject(projectId: string) {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  // Calculate remaining amounts for each category in each project
  function getCategoryRemaining(projectId: string, categoryId: string) {
    const categoryBudgets = budgets.filter((b) => b.project_id === projectId && b.category_id === categoryId)

    const budgetedK1WithVat = categoryBudgets.reduce((sum, b) => sum + (b.k1_with_vat || 0), 0)
    const budgetedK1WithoutVat = categoryBudgets.reduce((sum, b) => sum + (b.k1_without_vat || 0), 0)
    const budgetedK2 = categoryBudgets.reduce((sum, b) => sum + (b.k2 || 0), 0)

    const useWithVat = budgetedK1WithVat > 0
    const budgetedAmount = useWithVat ? budgetedK1WithVat : budgetedK1WithoutVat + budgetedK2

    const categoryTransactions = transactions.filter(
      (t) => t.project_id === projectId && t.category_id === categoryId && t.type !== "transfer",
    )

    const actualWithVat = useWithVat
      ? categoryTransactions.reduce((sum, t) => sum + ((t.amount_with_vat || 0) + (t.k2_amount || 0)), 0)
      : categoryTransactions.reduce((sum, t) => sum + ((t.amount_without_vat || 0) + (t.k2_amount || 0)), 0)

    const plannedAmount = existingSchedules
      .filter((s) => s.project_id === projectId && s.category_id === categoryId)
      .reduce((sum, s) => sum + (s.scheduled_amount || 0), 0)

    const remaining = budgetedAmount - actualWithVat - plannedAmount

    return {
      budgeted: budgetedAmount,
      actual: actualWithVat,
      remaining,
    }
  }

  // Get existing schedules for a category
  function getExistingSchedules(projectId: string, categoryId: string) {
    return existingSchedules.filter((s) => s.project_id === projectId && s.category_id === categoryId)
  }

  async function handleAddSchedule(projectId: string, categoryId: string) {
    console.log("[v0] handleAddSchedule called", { projectId, categoryId })

    const key = `${projectId}-${categoryId}`
    const schedule = newSchedules.get(key)

    console.log("[v0] Schedule data:", schedule)

    if (!schedule || !schedule.month || !schedule.amount) {
      console.log("[v0] Validation failed - missing month or amount")
      alert("Моля, изберете месец и въведете сума")
      return
    }

    const installments = Number.parseInt(schedule.installments) || 1
    const totalAmount = Number.parseFloat(schedule.amount)

    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.log("[v0] Invalid amount:", totalAmount)
      alert("Моля, въведете валидна сума")
      return
    }

    const amountPerInstallment = totalAmount / installments

    // Create schedules for each installment
    const schedulesToCreate = []
    const startDate = new Date(schedule.month + "-01")

    for (let i = 0; i < installments; i++) {
      const scheduleDate = new Date(startDate)
      scheduleDate.setMonth(scheduleDate.getMonth() + i)
      const monthStr = scheduleDate.toISOString().slice(0, 7)

      schedulesToCreate.push({
        project_id: projectId,
        category_id: categoryId,
        scheduled_month: monthStr + "-01",
        scheduled_amount: amountPerInstallment,
      })
    }

    console.log("[v0] Schedules to create:", schedulesToCreate)

    try {
      // Save to database
      const response = await fetch("/api/cash-flow-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: schedulesToCreate }),
      })

      console.log("[v0] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API error:", errorText)
        alert("Грешка при записване: " + errorText)
        return
      }

      // Clear the form
      const newMap = new Map(newSchedules)
      newMap.delete(key)
      setNewSchedules(newMap)

      console.log("[v0] Schedule saved successfully")

      onDataChange()
    } catch (error) {
      console.error("[v0] Error saving schedule:", error)
      alert("Грешка при записване: " + error)
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    const response = await fetch("/api/cash-flow-schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: scheduleId }),
    })

    if (response.ok) {
      onDataChange()
    }
  }

  function updateScheduleField(projectId: string, categoryId: string, field: string, value: string) {
    const key = `${projectId}-${categoryId}`
    const existing = newSchedules.get(key) || { month: "", amount: "", installments: "1" }
    const newMap = new Map(newSchedules)
    newMap.set(key, { ...existing, [field]: value })
    setNewSchedules(newMap)
  }

  // Get the next 12 months for the month selector
  const monthOptions = []
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
    // Use local time for both value and label to avoid timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const monthStr = `${year}-${month}`
    const label = date.toLocaleDateString("bg-BG", { year: "numeric", month: "long" })
    monthOptions.push({ value: monthStr, label })
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Планиране на плащания по проекти</h2>

        <div className="space-y-4">
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id)

            // Get all child categories with remaining amounts
            const childCategories = categories.filter((c) => c.parent_id !== null)
            const categoriesWithRemaining = childCategories
              .map((cat) => ({
                ...cat,
                ...getCategoryRemaining(project.id, cat.id),
              }))
              .filter((cat) => Math.abs(cat.remaining) > 0.01) // Only show categories with remaining amounts

            if (categoriesWithRemaining.length === 0) {
              return null
            }

            return (
              <div key={project.id} className="border rounded-lg">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold">{project.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({categoriesWithRemaining.length} категории с остатък)
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t space-y-4">
                    {categoriesWithRemaining.map((cat) => {
                      const parentCat = categories.find((c) => c.id === cat.parent_id)
                      const existingScheds = getExistingSchedules(project.id, cat.id)
                      const key = `${project.id}-${cat.id}`
                      const schedule = newSchedules.get(key) || { month: "", amount: "", installments: "1" }

                      const isIncome = parentCat?.type === "income"
                      const remainderColor = isIncome ? "text-green-600" : "text-red-600"

                      return (
                        <div key={cat.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{cat.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {parentCat?.name} → {cat.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Бюджет: {cat.budgeted.toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">Платено: {cat.actual.toFixed(2)}</p>
                              <p className={`text-lg font-bold ${remainderColor}`}>
                                Остатък: {cat.remaining.toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Existing schedules */}
                          {existingScheds.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Планирани плащания:</p>
                              {existingScheds.map((sched) => (
                                <div
                                  key={sched.id}
                                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                >
                                  <span className="text-sm">
                                    {new Date(sched.scheduled_month).toLocaleDateString("bg-BG", {
                                      year: "numeric",
                                      month: "long",
                                    })}
                                    : {sched.scheduled_amount.toFixed(2)} лв
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSchedule(sched.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add new schedule */}
                          <div className="grid grid-cols-4 gap-2">
                            <Select
                              value={schedule.month}
                              onValueChange={(value) => updateScheduleField(project.id, cat.id, "month", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Месец" />
                              </SelectTrigger>
                              <SelectContent>
                                {monthOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Сума"
                              value={schedule.amount}
                              onChange={(e) => updateScheduleField(project.id, cat.id, "amount", e.target.value)}
                            />

                            <Input
                              type="number"
                              min="1"
                              placeholder="Вноски"
                              value={schedule.installments}
                              onChange={(e) => updateScheduleField(project.id, cat.id, "installments", e.target.value)}
                            />

                            <Button onClick={() => handleAddSchedule(project.id, cat.id)} size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              Добави
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Изберете начален месец, обща сума и брой вноски. Сумата ще се раздели равномерно.
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {projects.every((p) => {
          const childCategories = categories.filter((c) => c.parent_id !== null)
          const categoriesWithRemaining = childCategories
            .map((cat) => ({
              ...cat,
              ...getCategoryRemaining(p.id, cat.id),
            }))
            .filter((cat) => Math.abs(cat.remaining) > 0.01)
          return categoriesWithRemaining.length === 0
        }) && (
          <div className="text-center py-8 text-muted-foreground">
            Няма категории с остатъци за планиране. Всички бюджети са изпълнени.
          </div>
        )}
      </div>
    </div>
  )
}
