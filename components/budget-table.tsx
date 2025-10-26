"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Category, Budget, Transaction, Account } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Pencil, Check, X, ArrowUp, ArrowDown, Trash2 } from "lucide-react"
import type { JSX } from "react/jsx-runtime"

interface BudgetTableProps {
  categories: Category[]
  budgets: Budget[]
  transactions: Transaction[]
  selectedMonth: string
  accounts: Account[]
  onBudgetUpdate: () => void
  readOnly?: boolean
  projectId: string | null
  months?: string[] // Added months prop for multi-month view
  allBudgets?: Budget[] // Added allBudgets prop for non-aggregated budgets
}

interface BudgetRow {
  categoryId: string
  k1WithVat: number
  k1WithoutVat: number
  vat: number
  k2: number
  totalWithoutVat: number
  totalWithVat: number
  actualWithoutVat: number
  actualWithVat: number
}

export function BudgetTable({
  categories,
  budgets,
  transactions,
  selectedMonth,
  accounts,
  onBudgetUpdate,
  readOnly = false,
  projectId,
  months = [selectedMonth], // Default to single month
  allBudgets = budgets, // Default to budgets prop
}: BudgetTableProps) {
  const [budgetData, setBudgetData] = useState<Record<string, BudgetRow>>({})
  const [saving, setSaving] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")

  const isMultiMonth = months.length > 1

  console.log(
    "[v0] BudgetTable render - months:",
    months,
    "isMultiMonth:",
    isMultiMonth,
    "readOnly:",
    readOnly,
    "projectId:",
    projectId,
  )

  useEffect(() => {
    const data: Record<string, BudgetRow> = {}

    categories.forEach((category) => {
      const categoryBudgets = budgets.filter((b) => b.category_id === category.id)
      const categoryTransactions = transactions.filter((t) => t.category_id === category.id)

      const k1WithVat = categoryBudgets.reduce((sum, b) => sum + (b.k1_with_vat || 0), 0)
      const k1WithoutVat = categoryBudgets.reduce((sum, b) => sum + (b.k1_without_vat || 0), 0)
      const vat = categoryBudgets.reduce((sum, b) => sum + (b.vat || 0), 0)
      const k2 = categoryBudgets.reduce((sum, b) => sum + (b.k2 || 0), 0)

      const actualWithVat = categoryTransactions.reduce((sum, t) => {
        if ((t.vat_amount || 0) > 0) {
          return sum + Math.abs(t.amount_with_vat || 0) + Math.abs(t.k2_amount || 0)
        }
        return sum
      }, 0)
      const actualWithoutVat = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount_without_vat || 0), 0)

      data[category.id] = {
        categoryId: category.id,
        k1WithVat,
        k1WithoutVat,
        vat,
        k2,
        totalWithoutVat: k1WithoutVat + k2,
        totalWithVat: k1WithVat + k2,
        actualWithoutVat,
        actualWithVat,
      }
    })

    setBudgetData(data)
  }, [categories, budgets, transactions])

  const handleK1WithVatChange = (categoryId: string, value: string) => {
    const withVat = value === "" ? 0 : Number.parseFloat(value)
    const withoutVat = withVat / 1.2
    const vat = withVat - withoutVat

    setBudgetData((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        k1WithVat: withVat,
        k1WithoutVat: withoutVat,
        vat,
        totalWithoutVat: withoutVat + prev[categoryId].k2,
        totalWithVat: withVat + prev[categoryId].k2,
      },
    }))
  }

  const handleK1WithoutVatChange = (categoryId: string, value: string) => {
    const withoutVat = value === "" ? 0 : Number.parseFloat(value)

    setBudgetData((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        k1WithVat: 0,
        k1WithoutVat: withoutVat,
        vat: 0,
        totalWithoutVat: withoutVat + prev[categoryId].k2,
        totalWithVat: prev[categoryId].k2,
      },
    }))
  }

  const handleK2Change = (categoryId: string, value: string) => {
    const k2 = value === "" ? 0 : Number.parseFloat(value)

    setBudgetData((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        k2,
        totalWithoutVat: prev[categoryId].k1WithoutVat + k2,
        totalWithVat: prev[categoryId].k1WithVat + k2,
      },
    }))
  }

  const handleSaveSingleCategory = async (categoryId: string) => {
    if (readOnly || !projectId) return

    const row = budgetData[categoryId]
    if (!row) return

    console.log("[v0] Auto-saving budget for category:", categoryId)
    const supabase = createClient()

    const { error } = await supabase.from("budgets").upsert(
      {
        category_id: categoryId,
        month: selectedMonth.includes("-") ? selectedMonth + "-01" : selectedMonth,
        project_id: projectId,
        k1_with_vat: row.k1WithVat,
        k1_without_vat: row.k1WithoutVat,
        vat: row.vat,
        k2: row.k2,
        total_without_vat: row.totalWithoutVat,
        total_with_vat: row.totalWithVat,
      },
      { onConflict: "category_id,month,project_id" },
    )

    if (error) {
      console.error("[v0] Error auto-saving budget:", error)
      alert("Error saving budget: " + error.message)
    } else {
      console.log("[v0] Budget auto-saved successfully")
      onBudgetUpdate()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    for (const [categoryId, row] of Object.entries(budgetData)) {
      const { error } = await supabase.from("budgets").upsert(
        {
          category_id: categoryId,
          month: selectedMonth.includes("-") ? selectedMonth + "-01" : selectedMonth,
          project_id: projectId,
          k1_with_vat: row.k1WithVat,
          k1_without_vat: row.k1WithoutVat,
          vat: row.vat,
          k2: row.k2,
          total_without_vat: row.totalWithoutVat,
          total_with_vat: row.totalWithVat,
        },
        { onConflict: "category_id,month,project_id" },
      )

      if (error) {
        console.error("Error saving budget:", error)
        alert("Error saving budget: " + error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onBudgetUpdate()
  }

  const handleEditCategory = (categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId)
    setEditingCategoryName(currentName)
  }

  const handleSaveCategoryName = async (categoryId: string) => {
    if (!editingCategoryName.trim()) {
      alert("Category name cannot be empty")
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("categories")
      .update({ name: editingCategoryName.trim() })
      .eq("id", categoryId)

    if (error) {
      console.error("Error updating category:", error)
      alert("Error updating category: " + error.message)
      return
    }

    setEditingCategoryId(null)
    setEditingCategoryName("")
    onBudgetUpdate() // Refresh data
  }

  const handleCancelEdit = () => {
    setEditingCategoryId(null)
    setEditingCategoryName("")
  }

  const handleMoveUp = async (categoryId: string, currentIndex: number, isChild: boolean, parentId?: string) => {
    if (currentIndex === 0) return // Already at top

    const supabase = createClient()

    // Get the siblings (same parent_id)
    const siblings = isChild
      ? categories.filter((c) => c.parent_id === parentId)
      : categories.filter((c) => !c.parent_id && c.type === categories.find((cat) => cat.id === categoryId)?.type)

    // Sort by order_index
    siblings.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

    const currentCategory = siblings[currentIndex]
    const previousCategory = siblings[currentIndex - 1]

    if (!currentCategory || !previousCategory) {
      console.error("[v0] Could not find categories to swap")
      return
    }

    console.log("[v0] Moving up:", currentCategory.name, "with", previousCategory.name)

    // Swap order_index values
    const { error: error1 } = await supabase
      .from("categories")
      .update({ order_index: previousCategory.order_index })
      .eq("id", currentCategory.id)

    const { error: error2 } = await supabase
      .from("categories")
      .update({ order_index: currentCategory.order_index })
      .eq("id", previousCategory.id)

    if (error1 || error2) {
      console.error("[v0] Error moving category:", error1 || error2)
      alert("Error moving category: " + (error1?.message || error2?.message || "Unknown error"))
      return
    }

    console.log("[v0] Successfully moved category up")
    onBudgetUpdate() // Refresh data
  }

  const handleMoveDown = async (
    categoryId: string,
    currentIndex: number,
    maxIndex: number,
    isChild: boolean,
    parentId?: string,
  ) => {
    if (currentIndex === maxIndex) return // Already at bottom

    const supabase = createClient()

    // Get the siblings (same parent_id)
    const siblings = isChild
      ? categories.filter((c) => c.parent_id === parentId)
      : categories.filter((c) => !c.parent_id && c.type === categories.find((cat) => cat.id === categoryId)?.type)

    // Sort by order_index
    siblings.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

    const currentCategory = siblings[currentIndex]
    const nextCategory = siblings[currentIndex + 1]

    if (!currentCategory || !nextCategory) {
      console.error("[v0] Could not find categories to swap")
      return
    }

    console.log("[v0] Moving down:", currentCategory.name, "with", nextCategory.name)

    // Swap order_index values
    const { error: error1 } = await supabase
      .from("categories")
      .update({ order_index: nextCategory.order_index })
      .eq("id", currentCategory.id)

    const { error: error2 } = await supabase
      .from("categories")
      .update({ order_index: currentCategory.order_index })
      .eq("id", nextCategory.id)

    if (error1 || error2) {
      console.error("[v0] Error moving category:", error1 || error2)
      alert("Error moving category: " + (error1?.message || error2?.message || "Unknown error"))
      return
    }

    console.log("[v0] Successfully moved category down")
    onBudgetUpdate() // Refresh data
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${categoryName}"? This will delete all associated budgets and remove this category from transactions.`,
      )
    ) {
      return
    }

    const supabase = createClient()

    try {
      // 1. Delete all budgets for this category
      const { error: budgetError } = await supabase.from("budgets").delete().eq("category_id", categoryId)

      if (budgetError) {
        console.error("Error deleting budgets:", budgetError)
        alert("Error deleting budgets: " + (budgetError?.message || "Unknown error"))
        return
      }

      // 2. Remove category from transactions (set to null instead of deleting transactions)
      const { error: transactionError } = await supabase
        .from("transactions")
        .update({ category_id: null })
        .eq("category_id", categoryId)

      if (transactionError) {
        console.error("Error updating transactions:", transactionError)
        alert("Error updating transactions: " + (transactionError?.message || "Unknown error"))
        return
      }

      // 3. Delete child categories (if this is a parent category)
      const childCategories = categories.filter((c) => c.parent_id === categoryId)
      for (const child of childCategories) {
        // Delete budgets for child category
        await supabase.from("budgets").delete().eq("category_id", child.id)
        // Remove child category from transactions
        await supabase.from("transactions").update({ category_id: null }).eq("category_id", child.id)
        // Delete child category
        await supabase.from("categories").delete().eq("id", child.id)
      }

      // 4. Finally, delete the category itself
      const { error: categoryError } = await supabase.from("categories").delete().eq("id", categoryId)

      if (categoryError) {
        console.error("Error deleting category:", categoryError)
        alert("Error deleting category: " + (categoryError?.message || "Unknown error"))
        return
      }

      // Refresh the data
      onBudgetUpdate()
    } catch (error) {
      console.error("Unexpected error deleting category:", error)
      alert("Unexpected error deleting category: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const incomeCategories = categories.filter((c) => c.type === "income" && !c.parent_id)
  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.parent_id)

  const renderMultiMonthView = () => {
    if (readOnly) {
      return (
        <div className="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Тази страница е само за преглед (Read-Only)</h3>
          <p className="text-yellow-700 mb-4">
            За да редактирате бюджетни данни, моля отидете на конкретна проектна страница.
          </p>
          <p className="text-sm text-yellow-600">
            Главната бюджет страница показва агрегирани данни от всички проекти и не може да се редактира директно.
          </p>
        </div>
      )
    }

    // Group budgets by month and category
    const budgetsByMonthAndCategory: Record<string, Record<string, Budget[]>> = {}
    months.forEach((month) => {
      budgetsByMonthAndCategory[month] = {}
      categories.forEach((cat) => {
        budgetsByMonthAndCategory[month][cat.id] = allBudgets.filter(
          (b) => b.category_id === cat.id && b.month.startsWith(month),
        )
      })
    })

    // Calculate values for each category and month
    const calculateValuesForMonth = (categoryId: string, month: string) => {
      const categoryBudgets = budgetsByMonthAndCategory[month][categoryId] || []
      const categoryTransactions = transactions.filter((t) => t.category_id === categoryId && t.date.startsWith(month))

      const k1WithVat = categoryBudgets.reduce((sum, b) => sum + (b.k1_with_vat || 0), 0)
      const k1WithoutVat = categoryBudgets.reduce((sum, b) => sum + (b.k1_without_vat || 0), 0)
      const vat = categoryBudgets.reduce((sum, b) => sum + (b.vat || 0), 0)
      const k2 = categoryBudgets.reduce((sum, b) => sum + (b.k2 || 0), 0)

      const actualWithVat = categoryTransactions.reduce((sum, t) => {
        if ((t.vat_amount || 0) > 0) {
          return sum + Math.abs(t.amount_with_vat || 0) + Math.abs(t.k2_amount || 0)
        }
        return sum
      }, 0)
      const actualWithoutVat = categoryTransactions.reduce((sum, t) => sum + Math.abs(t.amount_without_vat || 0), 0)

      return {
        k1WithVat,
        k1WithoutVat,
        vat,
        k2,
        totalWithoutVat: k1WithoutVat + k2,
        totalWithVat: k1WithVat + k2,
        actualWithoutVat,
        actualWithVat,
      }
    }

    // Format month name for display
    const formatMonthName = (month: string) => {
      const date = new Date(month + "-01")
      return date.toLocaleDateString("bg-BG", { month: "short", year: "numeric" })
    }

    // Calculate number of columns
    const numDataColumns = 10 // K1 with VAT, K1 without VAT, VAT, K2, Total without VAT, Actual without VAT, Deviation, Total with VAT, Actual with VAT, Deviation
    const totalColumns = 1 + months.length * numDataColumns + numDataColumns + 1 // Category + (months × 10) + totals (10) + Actions

    const handleMultiMonthBudgetChange = async (
      categoryId: string,
      month: string,
      field: "k1_with_vat" | "k1_without_vat" | "k2",
      value: string,
    ) => {
      if (readOnly) return

      const numValue = value === "" ? 0 : Number.parseFloat(value)
      const supabase = createClient()

      let updateData: any = {}

      if (field === "k1_with_vat") {
        const withVat = numValue
        const withoutVat = withVat / 1.2
        const vat = withVat - withoutVat
        updateData = {
          k1_with_vat: withVat,
          k1_without_vat: withoutVat,
          vat: vat,
        }
      } else if (field === "k1_without_vat") {
        updateData = {
          k1_with_vat: 0,
          k1_without_vat: numValue,
          vat: 0,
        }
      } else if (field === "k2") {
        updateData = {
          k2: numValue,
        }
      }

      const { error } = await supabase.from("budgets").upsert(
        {
          category_id: categoryId,
          month: month + "-01",
          project_id: projectId,
          ...updateData,
        },
        { onConflict: "category_id,month,project_id" },
      )

      if (error) {
        console.error("Error saving budget:", error)
        alert("Error saving budget: " + error.message)
        return
      }

      onBudgetUpdate()
    }

    return (
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Budget Overview - Multiple Months</h2>
          <div className="text-sm text-muted-foreground">
            Showing {months.length} months: {formatMonthName(months[0])} to {formatMonthName(months[months.length - 1])}
          </div>
        </div>

        {/* Multi-month view */}
        <div className="overflow-x-auto relative">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `minmax(200px, auto) repeat(${months.length * numDataColumns}, minmax(80px, 1fr)) repeat(${numDataColumns}, minmax(80px, 1fr)) minmax(100px, auto)`,
            }}
          >
            {/* Header Row 1: Month names */}
            <div className="p-3 border-b border-r-4 border-r-gray-400 font-bold bg-gray-200 sticky left-0 z-30">
              Category
            </div>
            {months.map((month, index) => (
              <div
                key={month}
                className={`p-3 border-b font-bold bg-gray-200 text-center ${
                  index === months.length - 1 ? "border-r-4 border-r-gray-400" : "border-r-4 border-r-gray-300"
                }`}
                style={{ gridColumn: `span ${numDataColumns}` }}
              >
                {formatMonthName(month)}
              </div>
            ))}
            <div
              className="p-3 border-b border-l-8 border-l-gray-500 font-bold bg-gray-400 text-center text-white"
              style={{ gridColumn: `span ${numDataColumns}` }}
            >
              ТОТАЛ ЗА ПЕРИОДА
            </div>
            <div className="p-3 border-b font-bold bg-gray-200 text-center">Actions</div>

            {/* Header Row 2: Column names */}
            <div className="p-2 border-b border-r-4 border-r-gray-400 font-bold bg-gray-100 sticky left-0 z-20"></div>
            {months.map((month, monthIndex) => (
              <>
                <div key={`${month}-k1vat`} className="p-2 border-b border-r font-bold bg-gray-100 text-center text-xs">
                  K1 VAT
                </div>
                <div key={`${month}-k1no`} className="p-2 border-b border-r font-bold bg-gray-100 text-center text-xs">
                  K1 no VAT
                </div>
                <div key={`${month}-vat`} className="p-2 border-b border-r font-bold bg-gray-100 text-center text-xs">
                  VAT
                </div>
                <div key={`${month}-k2`} className="p-2 border-b border-r font-bold bg-gray-100 text-center text-xs">
                  K2
                </div>
                <div
                  key={`${month}-totno`}
                  className="p-2 border-b border-r font-bold bg-yellow-50 text-center text-xs"
                >
                  Tot no VAT
                </div>
                <div
                  key={`${month}-actno`}
                  className="p-2 border-b border-r font-bold bg-yellow-50 text-center text-xs"
                >
                  Act no VAT
                </div>
                <div
                  key={`${month}-devno`}
                  className="p-2 border-b border-r font-bold bg-yellow-50 text-center text-xs"
                >
                  Dev
                </div>
                <div key={`${month}-totvat`} className="p-2 border-b border-r font-bold bg-blue-50 text-center text-xs">
                  Tot VAT
                </div>
                <div key={`${month}-actvat`} className="p-2 border-b border-r font-bold bg-blue-50 text-center text-xs">
                  Act VAT
                </div>
                <div
                  key={`${month}-devvat`}
                  className={`p-2 border-b font-bold bg-blue-50 text-center text-xs ${
                    monthIndex === months.length - 1 ? "border-r-4 border-r-gray-400" : "border-r-4 border-r-gray-300"
                  }`}
                >
                  Dev
                </div>
              </>
            ))}

            <div className="p-2 border-b border-l-8 border-l-gray-500 border-r font-bold bg-gray-300 text-center text-xs">
              K1 VAT
            </div>
            <div className="p-2 border-b border-r font-bold bg-gray-300 text-center text-xs">K1 no VAT</div>
            <div className="p-2 border-b border-r font-bold bg-gray-300 text-center text-xs">VAT</div>
            <div className="p-2 border-b border-r font-bold bg-gray-300 text-center text-xs">K2</div>
            <div className="p-2 border-b border-r font-bold bg-yellow-100 text-center text-xs">Tot no VAT</div>
            <div className="p-2 border-b border-r font-bold bg-yellow-100 text-center text-xs">Act no VAT</div>
            <div className="p-2 border-b border-r font-bold bg-yellow-100 text-center text-xs">Dev</div>
            <div className="p-2 border-b border-r font-bold bg-blue-100 text-center text-xs">Tot VAT</div>
            <div className="p-2 border-b border-r font-bold bg-blue-100 text-center text-xs">Act VAT</div>
            <div className="p-2 border-b border-r-4 border-r-gray-400 font-bold bg-blue-100 text-center text-xs">
              Dev
            </div>
            <div className="p-2 border-b font-bold bg-gray-100 text-center text-xs"></div>

            {/* ТОТАЛ row */}
            <div className="p-3 border-t-2 border-b-2 border-r-4 border-r-gray-400 font-bold bg-gray-200 sticky left-0 z-20">
              ТОТАЛ
            </div>
            {months.map((month, monthIndex) => {
              const incomeCalc = incomeCategories.reduce(
                (acc, parent) => {
                  const children = categories.filter((c) => c.parent_id === parent.id)
                  const parentCalc = children.reduce(
                    (childAcc, child) => {
                      const vals = calculateValuesForMonth(child.id, month)
                      return {
                        k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                        k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                        vat: childAcc.vat + vals.vat,
                        k2: childAcc.k2 + vals.k2,
                        totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                        totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                        actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                        actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return {
                    k1WithVat: acc.k1WithVat + parentCalc.k1WithVat,
                    k1WithoutVat: acc.k1WithoutVat + parentCalc.k1WithoutVat,
                    vat: acc.vat + parentCalc.vat,
                    k2: acc.k2 + parentCalc.k2,
                    totalWithoutVat: acc.totalWithoutVat + parentCalc.totalWithoutVat,
                    totalWithVat: acc.totalWithVat + parentCalc.totalWithVat,
                    actualWithoutVat: acc.actualWithoutVat + parentCalc.actualWithoutVat,
                    actualWithVat: acc.actualWithVat + parentCalc.actualWithVat,
                  }
                },
                {
                  k1WithVat: 0,
                  k1WithoutVat: 0,
                  vat: 0,
                  k2: 0,
                  totalWithoutVat: 0,
                  totalWithVat: 0,
                  actualWithoutVat: 0,
                  actualWithVat: 0,
                },
              )
              const expenseCalc = expenseCategories.reduce(
                (acc, parent) => {
                  const children = categories.filter((c) => c.parent_id === parent.id)
                  const parentCalc = children.reduce(
                    (childAcc, child) => {
                      const vals = calculateValuesForMonth(child.id, month)
                      return {
                        k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                        k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                        vat: childAcc.vat + vals.vat,
                        k2: childAcc.k2 + vals.k2,
                        totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                        totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                        actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                        actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return {
                    k1WithVat: acc.k1WithVat + parentCalc.k1WithVat,
                    k1WithoutVat: acc.k1WithoutVat + parentCalc.k1WithoutVat,
                    vat: acc.vat + parentCalc.vat,
                    k2: acc.k2 + parentCalc.k2,
                    totalWithoutVat: acc.totalWithoutVat + parentCalc.totalWithoutVat,
                    totalWithVat: acc.totalWithVat + parentCalc.totalWithVat,
                    actualWithoutVat: acc.actualWithoutVat + parentCalc.actualWithoutVat,
                    actualWithVat: acc.actualWithVat + parentCalc.actualWithVat,
                  }
                },
                {
                  k1WithVat: 0,
                  k1WithoutVat: 0,
                  vat: 0,
                  k2: 0,
                  totalWithoutVat: 0,
                  totalWithVat: 0,
                  actualWithoutVat: 0,
                  actualWithVat: 0,
                },
              )
              return (
                <>
                  <div
                    key={`${month}-k1vat`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.k1WithVat - expenseCalc.k1WithVat).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-k1no`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.k1WithoutVat - expenseCalc.k1WithoutVat).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-vat`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.vat - expenseCalc.vat).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-k2`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.k2 - expenseCalc.k2).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-totno`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.totalWithoutVat - expenseCalc.totalWithoutVat).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-actno`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.actualWithoutVat - expenseCalc.actualWithoutVat).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-devno`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(
                      incomeCalc.totalWithoutVat -
                      incomeCalc.actualWithoutVat -
                      (expenseCalc.totalWithoutVat - expenseCalc.actualWithoutVat)
                    ).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-totvat`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.totalWithVat - expenseCalc.totalWithVat).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-actvat`}
                    className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-200 text-sm font-bold"
                  >
                    {(incomeCalc.actualWithVat - expenseCalc.actualWithVat).toFixed(2)}
                  </div>
                  <div
                    key={`${month}-devvat`}
                    className="p-2 border-t-2 border-b-2 text-right bg-gray-200 text-sm font-bold"
                  >
                    {(
                      incomeCalc.totalWithVat -
                      incomeCalc.actualWithVat -
                      (expenseCalc.totalWithVat - expenseCalc.actualWithVat)
                    ).toFixed(2)}
                  </div>
                </>
              )
            })}
            {/* Grand total columns */}
            {(() => {
              const totalIncome = months.reduce(
                (acc, month) => {
                  const incomeCalc = incomeCategories.reduce(
                    (catAcc, parent) => {
                      const children = categories.filter((c) => c.parent_id === parent.id)
                      const parentCalc = children.reduce(
                        (childAcc, child) => {
                          const vals = calculateValuesForMonth(child.id, month)
                          return {
                            k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                            k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                            vat: childAcc.vat + vals.vat,
                            k2: childAcc.k2 + vals.k2,
                            totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                            totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                            actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                            actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                          }
                        },
                        {
                          k1WithVat: 0,
                          k1WithoutVat: 0,
                          vat: 0,
                          k2: 0,
                          totalWithoutVat: 0,
                          totalWithVat: 0,
                          actualWithoutVat: 0,
                          actualWithVat: 0,
                        },
                      )
                      return {
                        k1WithVat: catAcc.k1WithVat + parentCalc.k1WithVat,
                        k1WithoutVat: catAcc.k1WithoutVat + parentCalc.k1WithoutVat,
                        vat: catAcc.vat + parentCalc.vat,
                        k2: catAcc.k2 + parentCalc.k2,
                        totalWithoutVat: catAcc.totalWithoutVat + parentCalc.totalWithoutVat,
                        totalWithVat: catAcc.totalWithVat + parentCalc.totalWithVat,
                        actualWithoutVat: catAcc.actualWithoutVat + parentCalc.actualWithoutVat,
                        actualWithVat: catAcc.actualWithVat + parentCalc.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return {
                    k1WithVat: acc.k1WithVat + incomeCalc.k1WithVat,
                    k1WithoutVat: acc.k1WithoutVat + incomeCalc.k1WithoutVat,
                    vat: acc.vat + incomeCalc.vat,
                    k2: acc.k2 + incomeCalc.k2,
                    totalWithoutVat: acc.totalWithoutVat + incomeCalc.totalWithoutVat,
                    totalWithVat: acc.totalWithVat + incomeCalc.totalWithVat,
                    actualWithoutVat: acc.actualWithoutVat + incomeCalc.actualWithoutVat,
                    actualWithVat: acc.actualWithVat + incomeCalc.actualWithVat,
                  }
                },
                {
                  k1WithVat: 0,
                  k1WithoutVat: 0,
                  vat: 0,
                  k2: 0,
                  totalWithoutVat: 0,
                  totalWithVat: 0,
                  actualWithoutVat: 0,
                  actualWithVat: 0,
                },
              )
              const totalExpense = months.reduce(
                (acc, month) => {
                  const expenseCalc = expenseCategories.reduce(
                    (catAcc, parent) => {
                      const children = categories.filter((c) => c.parent_id === parent.id)
                      const parentCalc = children.reduce(
                        (childAcc, child) => {
                          const vals = calculateValuesForMonth(child.id, month)
                          return {
                            k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                            k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                            vat: childAcc.vat + vals.vat,
                            k2: childAcc.k2 + vals.k2,
                            totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                            totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                            actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                            actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                          }
                        },
                        {
                          k1WithVat: 0,
                          k1WithoutVat: 0,
                          vat: 0,
                          k2: 0,
                          totalWithoutVat: 0,
                          totalWithVat: 0,
                          actualWithoutVat: 0,
                          actualWithVat: 0,
                        },
                      )
                      return {
                        k1WithVat: catAcc.k1WithVat + parentCalc.k1WithVat,
                        k1WithoutVat: catAcc.k1WithoutVat + parentCalc.k1WithoutVat,
                        vat: catAcc.vat + parentCalc.vat,
                        k2: catAcc.k2 + parentCalc.k2,
                        totalWithoutVat: catAcc.totalWithoutVat + parentCalc.totalWithoutVat,
                        totalWithVat: catAcc.totalWithVat + parentCalc.totalWithVat,
                        actualWithoutVat: catAcc.actualWithoutVat + parentCalc.actualWithoutVat,
                        actualWithVat: catAcc.actualWithVat + parentCalc.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return {
                    k1WithVat: acc.k1WithVat + expenseCalc.k1WithVat,
                    k1WithoutVat: acc.k1WithoutVat + expenseCalc.k1WithoutVat,
                    vat: acc.vat + expenseCalc.vat,
                    k2: acc.k2 + expenseCalc.k2,
                    totalWithoutVat: acc.totalWithoutVat + expenseCalc.totalWithoutVat,
                    totalWithVat: acc.totalWithVat + expenseCalc.totalWithVat,
                    actualWithoutVat: acc.actualWithoutVat + expenseCalc.actualWithoutVat,
                    actualWithVat: acc.actualWithVat + expenseCalc.actualWithVat,
                  }
                },
                {
                  k1WithVat: 0,
                  k1WithoutVat: 0,
                  vat: 0,
                  k2: 0,
                  totalWithoutVat: 0,
                  totalWithVat: 0,
                  actualWithoutVat: 0,
                  actualWithVat: 0,
                },
              )
              return (
                <>
                  <div className="p-2 border-t-2 border-b-2 border-l-8 border-l-gray-500 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.k1WithVat - totalExpense.k1WithVat).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.k1WithoutVat - totalExpense.k1WithoutVat).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.vat - totalExpense.vat).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.k2 - totalExpense.k2).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.totalWithoutVat - totalExpense.totalWithoutVat).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.actualWithoutVat - totalExpense.actualWithoutVat).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(
                      totalIncome.totalWithoutVat -
                      totalIncome.actualWithoutVat -
                      (totalExpense.totalWithoutVat - totalExpense.actualWithoutVat)
                    ).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.totalWithVat - totalExpense.totalWithVat).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r text-right bg-gray-300 text-sm font-bold">
                    {(totalIncome.actualWithVat - totalExpense.actualWithVat).toFixed(2)}
                  </div>
                  <div className="p-2 border-t-2 border-b-2 border-r-4 border-r-gray-400 text-right bg-gray-300 text-sm font-bold">
                    {(
                      totalIncome.totalWithVat -
                      totalIncome.actualWithVat -
                      (totalExpense.totalWithVat - totalExpense.actualWithVat)
                    ).toFixed(2)}
                  </div>
                </>
              )
            })()}
            <div className="p-2 border-t-2 border-b-2 bg-gray-200"></div>

            {/* Тотал приходи row */}
            {incomeCategories.length > 0 && (
              <>
                <div className="p-3 border-t-2 border-r-4 border-r-gray-400 font-bold bg-green-100 sticky left-0 z-20">
                  Тотал приходи
                </div>
                {months.map((month, monthIndex) => {
                  const incomeCalc = incomeCategories.reduce(
                    (acc, parent) => {
                      const children = categories.filter((c) => c.parent_id === parent.id)
                      const parentCalc = children.reduce(
                        (childAcc, child) => {
                          const vals = calculateValuesForMonth(child.id, month)
                          return {
                            k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                            k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                            vat: childAcc.vat + vals.vat,
                            k2: childAcc.k2 + vals.k2,
                            totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                            totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                            actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                            actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                          }
                        },
                        {
                          k1WithVat: 0,
                          k1WithoutVat: 0,
                          vat: 0,
                          k2: 0,
                          totalWithoutVat: 0,
                          totalWithVat: 0,
                          actualWithoutVat: 0,
                          actualWithVat: 0,
                        },
                      )
                      return {
                        k1WithVat: acc.k1WithVat + parentCalc.k1WithVat,
                        k1WithoutVat: acc.k1WithoutVat + parentCalc.k1WithoutVat,
                        vat: acc.vat + parentCalc.vat,
                        k2: acc.k2 + parentCalc.k2,
                        totalWithoutVat: acc.totalWithoutVat + parentCalc.totalWithoutVat,
                        totalWithVat: acc.totalWithVat + parentCalc.totalWithVat,
                        actualWithoutVat: acc.actualWithoutVat + parentCalc.actualWithoutVat,
                        actualWithVat: acc.actualWithVat + parentCalc.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return (
                    <>
                      <div
                        key={`${month}-k1vat`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.k1WithVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-k1no`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.k1WithoutVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-vat`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.vat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-k2`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.k2.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-totno`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.totalWithoutVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-actno`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.actualWithoutVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-devno`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {(incomeCalc.totalWithoutVat - incomeCalc.actualWithoutVat).toFixed(2)}
                      </div>
                      <div
                        key={`${month}-totvat`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.totalWithVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-actvat`}
                        className="p-2 border-t-2 border-r text-right bg-green-100 text-sm font-bold"
                      >
                        {incomeCalc.actualWithVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-devvat`}
                        className={`p-2 border-t-2 text-right bg-green-100 text-sm font-bold ${
                          monthIndex === months.length - 1
                            ? "border-r-4 border-r-gray-400"
                            : "border-r-4 border-r-gray-300"
                        }`}
                      >
                        {(incomeCalc.totalWithVat - incomeCalc.actualWithVat).toFixed(2)}
                      </div>
                    </>
                  )
                })}
                {/* Total columns for income */}
                {(() => {
                  const totalIncome = months.reduce(
                    (acc, month) => {
                      const incomeCalc = incomeCategories.reduce(
                        (catAcc, parent) => {
                          const children = categories.filter((c) => c.parent_id === parent.id)
                          const parentCalc = children.reduce(
                            (childAcc, child) => {
                              const vals = calculateValuesForMonth(child.id, month)
                              return {
                                k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                                k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                                vat: childAcc.vat + vals.vat,
                                k2: childAcc.k2 + vals.k2,
                                totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                                totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                                actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                                actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                              }
                            },
                            {
                              k1WithVat: 0,
                              k1WithoutVat: 0,
                              vat: 0,
                              k2: 0,
                              totalWithoutVat: 0,
                              totalWithVat: 0,
                              actualWithoutVat: 0,
                              actualWithVat: 0,
                            },
                          )
                          return {
                            k1WithVat: catAcc.k1WithVat + parentCalc.k1WithVat,
                            k1WithoutVat: catAcc.k1WithoutVat + parentCalc.k1WithoutVat,
                            vat: catAcc.vat + parentCalc.vat,
                            k2: catAcc.k2 + parentCalc.k2,
                            totalWithoutVat: catAcc.totalWithoutVat + parentCalc.totalWithoutVat,
                            totalWithVat: catAcc.totalWithVat + parentCalc.totalWithVat,
                            actualWithoutVat: catAcc.actualWithoutVat + parentCalc.actualWithoutVat,
                            actualWithVat: catAcc.actualWithVat + parentCalc.actualWithVat,
                          }
                        },
                        {
                          k1WithVat: 0,
                          k1WithoutVat: 0,
                          vat: 0,
                          k2: 0,
                          totalWithoutVat: 0,
                          totalWithVat: 0,
                          actualWithoutVat: 0,
                          actualWithVat: 0,
                        },
                      )
                      return {
                        k1WithVat: acc.k1WithVat + incomeCalc.k1WithVat,
                        k1WithoutVat: acc.k1WithoutVat + incomeCalc.k1WithoutVat,
                        vat: acc.vat + incomeCalc.vat,
                        k2: acc.k2 + incomeCalc.k2,
                        totalWithoutVat: acc.totalWithoutVat + incomeCalc.totalWithoutVat,
                        totalWithVat: acc.totalWithVat + incomeCalc.totalWithVat,
                        actualWithoutVat: acc.actualWithoutVat + incomeCalc.actualWithoutVat,
                        actualWithVat: acc.actualWithVat + incomeCalc.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return (
                    <>
                      <div className="p-2 border-t-2 border-l-8 border-l-gray-500 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.k1WithVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.k1WithoutVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.vat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.k2.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.totalWithoutVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.actualWithoutVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {(totalIncome.totalWithoutVat - totalIncome.actualWithoutVat).toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.totalWithVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-green-200 text-sm font-bold">
                        {totalIncome.actualWithVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r-4 border-r-gray-400 text-right bg-green-200 text-sm font-bold">
                        {(totalIncome.totalWithVat - totalIncome.actualWithVat).toFixed(2)}
                      </div>
                    </>
                  )
                })()}
                <div className="p-2 border-t-2 bg-green-100"></div>
              </>
            )}

            {/* Income parent rows */}
            {incomeCategories.map((parent, parentIndex) => {
              const children = categories.filter((c) => c.parent_id === parent.id)
              children.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

              return (
                <div key={parent.id} className="contents">
                  {/* Parent row */}
                  <div className="p-3 border-b border-r-4 border-r-gray-400 font-semibold bg-gray-50 sticky left-0 z-20">
                    {parent.name}
                  </div>
                  {months.map((month, monthIndex) => {
                    const parentCalc = children.reduce(
                      (acc, child) => {
                        const vals = calculateValuesForMonth(child.id, month)
                        return {
                          k1WithVat: acc.k1WithVat + vals.k1WithVat,
                          k1WithoutVat: acc.k1WithoutVat + vals.k1WithoutVat,
                          vat: acc.vat + vals.vat,
                          k2: acc.k2 + vals.k2,
                          totalWithoutVat: acc.totalWithoutVat + vals.totalWithoutVat,
                          totalWithVat: acc.totalWithVat + vals.totalWithVat,
                          actualWithoutVat: acc.actualWithoutVat + vals.actualWithoutVat,
                          actualWithVat: acc.actualWithVat + vals.actualWithVat,
                        }
                      },
                      {
                        k1WithVat: 0,
                        k1WithoutVat: 0,
                        vat: 0,
                        k2: 0,
                        totalWithoutVat: 0,
                        totalWithVat: 0,
                        actualWithoutVat: 0,
                        actualWithVat: 0,
                      },
                    )
                    return (
                      <>
                        <div key={`${month}-k1vat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.k1WithVat.toFixed(2)}
                        </div>
                        <div key={`${month}-k1no`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.k1WithoutVat.toFixed(2)}
                        </div>
                        <div key={`${month}-vat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.vat.toFixed(2)}
                        </div>
                        <div key={`${month}-k2`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.k2.toFixed(2)}
                        </div>
                        <div key={`${month}-totno`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.totalWithoutVat.toFixed(2)}
                        </div>
                        <div key={`${month}-actno`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.actualWithoutVat.toFixed(2)}
                        </div>
                        <div key={`${month}-devno`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {(parentCalc.totalWithoutVat - parentCalc.actualWithoutVat).toFixed(2)}
                        </div>
                        <div key={`${month}-totvat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.totalWithVat.toFixed(2)}
                        </div>
                        <div key={`${month}-actvat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.actualWithVat.toFixed(2)}
                        </div>
                        <div
                          key={`${month}-devvat`}
                          className={`p-2 border-b text-right bg-gray-50 text-sm ${
                            monthIndex === months.length - 1
                              ? "border-r-4 border-r-gray-400"
                              : "border-r-4 border-r-gray-300"
                          }`}
                        >
                          {(parentCalc.totalWithVat - parentCalc.actualWithVat).toFixed(2)}
                        </div>
                      </>
                    )
                  })}
                  {/* Total columns for parent */}
                  {(() => {
                    const totalCalc = months.reduce(
                      (acc, month) => {
                        const parentCalc = children.reduce(
                          (childAcc, child) => {
                            const vals = calculateValuesForMonth(child.id, month)
                            return {
                              k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                              k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                              vat: childAcc.vat + vals.vat,
                              k2: childAcc.k2 + vals.k2,
                              totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                              totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                              actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                              actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                            }
                          },
                          {
                            k1WithVat: 0,
                            k1WithoutVat: 0,
                            vat: 0,
                            k2: 0,
                            totalWithoutVat: 0,
                            totalWithVat: 0,
                            actualWithoutVat: 0,
                            actualWithVat: 0,
                          },
                        )
                        return {
                          k1WithVat: acc.k1WithVat + parentCalc.k1WithVat,
                          k1WithoutVat: acc.k1WithoutVat + parentCalc.k1WithoutVat,
                          vat: acc.vat + parentCalc.vat,
                          k2: acc.k2 + parentCalc.k2,
                          totalWithoutVat: acc.totalWithoutVat + parentCalc.totalWithoutVat,
                          totalWithVat: acc.totalWithVat + parentCalc.totalWithVat,
                          actualWithoutVat: acc.actualWithoutVat + parentCalc.actualWithoutVat,
                          actualWithVat: acc.actualWithVat + parentCalc.actualWithVat,
                        }
                      },
                      {
                        k1WithVat: 0,
                        k1WithoutVat: 0,
                        vat: 0,
                        k2: 0,
                        totalWithoutVat: 0,
                        totalWithVat: 0,
                        actualWithoutVat: 0,
                        actualWithVat: 0,
                      },
                    )
                    return (
                      <>
                        <div className="p-2 border-b border-l-8 border-l-gray-500 border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.k1WithVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.k1WithoutVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.vat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.k2.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.totalWithoutVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.actualWithoutVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {(totalCalc.totalWithoutVat - totalCalc.actualWithoutVat).toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.totalWithVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.actualWithVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r-4 border-r-gray-400 text-right bg-gray-100 text-sm font-semibold">
                          {(totalCalc.totalWithVat - totalCalc.actualWithVat).toFixed(2)}
                        </div>
                      </>
                    )
                  })()}
                  <div className="p-2 border-b bg-gray-50"></div>

                  {/* Child rows with input fields */}
                  {children.map((child) => (
                    <div key={child.id} className="contents">
                      <div className="p-2 border-b border-r-4 border-r-gray-400 pl-8 bg-white sticky left-0 z-20 text-sm">
                        ↳ {child.name}
                      </div>
                      {months.map((month, monthIndex) => {
                        const vals = calculateValuesForMonth(child.id, month)
                        return (
                          <>
                            <div key={`${month}-k1vat`} className="border-b border-r bg-white">
                              {readOnly ? (
                                <div className="p-2 text-right text-sm">{vals.k1WithVat.toFixed(2)}</div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={vals.k1WithVat}
                                  onBlur={(e) =>
                                    handleMultiMonthBudgetChange(child.id, month, "k1_with_vat", e.target.value)
                                  }
                                  className="w-full p-2 text-right text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              )}
                            </div>
                            <div key={`${month}-k1no`} className="border-b border-r bg-white">
                              {readOnly ? (
                                <div className="p-2 text-right text-sm">{vals.k1WithoutVat.toFixed(2)}</div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={vals.k1WithoutVat}
                                  onBlur={(e) =>
                                    handleMultiMonthBudgetChange(child.id, month, "k1_without_vat", e.target.value)
                                  }
                                  className="w-full p-2 text-right text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              )}
                            </div>
                            <div key={`${month}-vat`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.vat.toFixed(2)}
                            </div>
                            <div key={`${month}-k2`} className="border-b border-r bg-white">
                              {readOnly ? (
                                <div className="p-2 text-right text-sm">{vals.k2.toFixed(2)}</div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={vals.k2}
                                  onBlur={(e) => handleMultiMonthBudgetChange(child.id, month, "k2", e.target.value)}
                                  className="w-full p-2 text-right text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              )}
                            </div>
                            <div key={`${month}-totno`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.totalWithoutVat.toFixed(2)}
                            </div>
                            <div key={`${month}-actno`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.actualWithoutVat.toFixed(2)}
                            </div>
                            <div key={`${month}-devno`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {(vals.totalWithoutVat - vals.actualWithoutVat).toFixed(2)}
                            </div>
                            <div key={`${month}-totvat`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.totalWithVat.toFixed(2)}
                            </div>
                            <div key={`${month}-actvat`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.actualWithVat.toFixed(2)}
                            </div>
                            <div
                              key={`${month}-devvat`}
                              className={`p-2 border-b text-right bg-white text-sm ${
                                monthIndex === months.length - 1
                                  ? "border-r-4 border-r-gray-400"
                                  : "border-r-4 border-r-gray-300"
                              }`}
                            >
                              {(vals.totalWithVat - vals.actualWithVat).toFixed(2)}
                            </div>
                          </>
                        )
                      })}
                      {/* Total columns for child */}
                      {(() => {
                        const totalCalc = months.reduce(
                          (acc, month) => {
                            const vals = calculateValuesForMonth(child.id, month)
                            return {
                              k1WithVat: acc.k1WithVat + vals.k1WithVat,
                              k1WithoutVat: acc.k1WithoutVat + vals.k1WithoutVat,
                              vat: acc.vat + vals.vat,
                              k2: acc.k2 + vals.k2,
                              totalWithoutVat: acc.totalWithoutVat + vals.totalWithoutVat,
                              totalWithVat: acc.totalWithVat + vals.totalWithVat,
                              actualWithoutVat: acc.actualWithoutVat + vals.actualWithoutVat,
                              actualWithVat: acc.actualWithVat + vals.actualWithVat,
                            }
                          },
                          {
                            k1WithVat: 0,
                            k1WithoutVat: 0,
                            vat: 0,
                            k2: 0,
                            totalWithoutVat: 0,
                            totalWithVat: 0,
                            actualWithoutVat: 0,
                            actualWithVat: 0,
                          },
                        )
                        return (
                          <>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.k1WithVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.k1WithoutVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.vat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.k2.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.totalWithoutVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.actualWithoutVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {(totalCalc.totalWithoutVat - totalCalc.actualWithoutVat).toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.totalWithVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.actualWithVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r-4 border-r-gray-400 text-right bg-gray-50 text-sm">
                              {(totalCalc.totalWithVat - totalCalc.actualWithVat).toFixed(2)}
                            </div>
                          </>
                        )
                      })()}
                      <div className="p-2 border-b bg-white"></div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Тотал разходи row */}
            {expenseCategories.length > 0 && (
              <>
                <div className="p-3 border-t-2 border-r-4 border-r-gray-400 font-bold bg-red-100 sticky left-0 z-20">
                  Тотал разходи
                </div>
                {months.map((month, monthIndex) => {
                  const expenseCalc = expenseCategories.reduce(
                    (acc, parent) => {
                      const children = categories.filter((c) => c.parent_id === parent.id)
                      const parentCalc = children.reduce(
                        (childAcc, child) => {
                          const vals = calculateValuesForMonth(child.id, month)
                          return {
                            k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                            k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                            vat: childAcc.vat + vals.vat,
                            k2: childAcc.k2 + vals.k2,
                            totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                            totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                            actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                            actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                          }
                        },
                        {
                          k1WithVat: 0,
                          k1WithoutVat: 0,
                          vat: 0,
                          k2: 0,
                          totalWithoutVat: 0,
                          totalWithVat: 0,
                          actualWithoutVat: 0,
                          actualWithVat: 0,
                        },
                      )
                      return {
                        k1WithVat: acc.k1WithVat + parentCalc.k1WithVat,
                        k1WithoutVat: acc.k1WithoutVat + parentCalc.k1WithoutVat,
                        vat: acc.vat + parentCalc.vat,
                        k2: acc.k2 + parentCalc.k2,
                        totalWithoutVat: acc.totalWithoutVat + parentCalc.totalWithoutVat,
                        totalWithVat: acc.totalWithVat + parentCalc.totalWithVat,
                        actualWithoutVat: acc.actualWithoutVat + parentCalc.actualWithoutVat,
                        actualWithVat: acc.actualWithVat + parentCalc.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return (
                    <>
                      <div
                        key={`${month}-k1vat`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.k1WithVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-k1no`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.k1WithoutVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-vat`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.vat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-k2`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.k2.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-totno`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.totalWithoutVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-actno`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.actualWithoutVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-devno`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {(expenseCalc.totalWithoutVat - expenseCalc.actualWithoutVat).toFixed(2)}
                      </div>
                      <div
                        key={`${month}-totvat`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.totalWithVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-actvat`}
                        className="p-2 border-t-2 border-r text-right bg-red-100 text-sm font-bold"
                      >
                        {expenseCalc.actualWithVat.toFixed(2)}
                      </div>
                      <div
                        key={`${month}-devvat`}
                        className={`p-2 border-t-2 text-right bg-red-100 text-sm font-bold ${
                          monthIndex === months.length - 1
                            ? "border-r-4 border-r-gray-400"
                            : "border-r-4 border-r-gray-300"
                        }`}
                      >
                        {(expenseCalc.totalWithVat - expenseCalc.actualWithVat).toFixed(2)}
                      </div>
                    </>
                  )
                })}
                {/* Total columns for expense */}
                {(() => {
                  const totalExpense = months.reduce(
                    (acc, month) => {
                      const expenseCalc = expenseCategories.reduce(
                        (catAcc, parent) => {
                          const children = categories.filter((c) => c.parent_id === parent.id)
                          const parentCalc = children.reduce(
                            (childAcc, child) => {
                              const vals = calculateValuesForMonth(child.id, month)
                              return {
                                k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                                k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                                vat: childAcc.vat + vals.vat,
                                k2: childAcc.k2 + vals.k2,
                                totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                                totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                                actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                                actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                              }
                            },
                            {
                              k1WithVat: 0,
                              k1WithoutVat: 0,
                              vat: 0,
                              k2: 0,
                              totalWithoutVat: 0,
                              totalWithVat: 0,
                              actualWithoutVat: 0,
                              actualWithVat: 0,
                            },
                          )
                          return {
                            k1WithVat: catAcc.k1WithVat + parentCalc.k1WithVat,
                            k1WithoutVat: catAcc.k1WithoutVat + parentCalc.k1WithoutVat,
                            vat: catAcc.vat + parentCalc.vat,
                            k2: catAcc.k2 + parentCalc.k2,
                            totalWithoutVat: catAcc.totalWithoutVat + parentCalc.totalWithoutVat,
                            totalWithVat: catAcc.totalWithVat + parentCalc.totalWithVat,
                            actualWithoutVat: catAcc.actualWithoutVat + parentCalc.actualWithoutVat,
                            actualWithVat: catAcc.actualWithVat + parentCalc.actualWithVat,
                          }
                        },
                        {
                          k1WithVat: 0,
                          k1WithoutVat: 0,
                          vat: 0,
                          k2: 0,
                          totalWithoutVat: 0,
                          totalWithVat: 0,
                          actualWithoutVat: 0,
                          actualWithVat: 0,
                        },
                      )
                      return {
                        k1WithVat: acc.k1WithVat + expenseCalc.k1WithVat,
                        k1WithoutVat: acc.k1WithoutVat + expenseCalc.k1WithoutVat,
                        vat: acc.vat + expenseCalc.vat,
                        k2: acc.k2 + expenseCalc.k2,
                        totalWithoutVat: acc.totalWithoutVat + expenseCalc.totalWithoutVat,
                        totalWithVat: acc.totalWithVat + expenseCalc.totalWithVat,
                        actualWithoutVat: acc.actualWithoutVat + expenseCalc.actualWithoutVat,
                        actualWithVat: acc.actualWithVat + expenseCalc.actualWithVat,
                      }
                    },
                    {
                      k1WithVat: 0,
                      k1WithoutVat: 0,
                      vat: 0,
                      k2: 0,
                      totalWithoutVat: 0,
                      totalWithVat: 0,
                      actualWithoutVat: 0,
                      actualWithVat: 0,
                    },
                  )
                  return (
                    <>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.k1WithVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.k1WithoutVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.vat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.k2.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.totalWithoutVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.actualWithoutVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {(totalExpense.totalWithoutVat - totalExpense.actualWithoutVat).toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.totalWithVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r text-right bg-red-200 text-sm font-bold">
                        {totalExpense.actualWithVat.toFixed(2)}
                      </div>
                      <div className="p-2 border-t-2 border-r-4 border-r-gray-400 text-right bg-red-200 text-sm font-bold">
                        {(totalExpense.totalWithVat - totalExpense.actualWithVat).toFixed(2)}
                      </div>
                    </>
                  )
                })()}
                <div className="p-2 border-t-2 bg-red-100"></div>
              </>
            )}

            {/* Expense parent rows */}
            {expenseCategories.map((parent, parentIndex) => {
              const children = categories.filter((c) => c.parent_id === parent.id)
              children.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

              return (
                <div key={parent.id} className="contents">
                  {/* Parent row */}
                  <div className="p-3 border-b border-r-4 border-r-gray-400 font-semibold bg-gray-50 sticky left-0 z-20">
                    {parent.name}
                  </div>
                  {months.map((month, monthIndex) => {
                    const parentCalc = children.reduce(
                      (acc, child) => {
                        const vals = calculateValuesForMonth(child.id, month)
                        return {
                          k1WithVat: acc.k1WithVat + vals.k1WithVat,
                          k1WithoutVat: acc.k1WithoutVat + vals.k1WithoutVat,
                          vat: acc.vat + vals.vat,
                          k2: acc.k2 + vals.k2,
                          totalWithoutVat: acc.totalWithoutVat + vals.totalWithoutVat,
                          totalWithVat: acc.totalWithVat + vals.totalWithVat,
                          actualWithoutVat: acc.actualWithoutVat + vals.actualWithoutVat,
                          actualWithVat: acc.actualWithVat + vals.actualWithVat,
                        }
                      },
                      {
                        k1WithVat: 0,
                        k1WithoutVat: 0,
                        vat: 0,
                        k2: 0,
                        totalWithoutVat: 0,
                        totalWithVat: 0,
                        actualWithoutVat: 0,
                        actualWithVat: 0,
                      },
                    )
                    return (
                      <>
                        <div key={`${month}-k1vat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.k1WithVat.toFixed(2)}
                        </div>
                        <div key={`${month}-k1no`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.k1WithoutVat.toFixed(2)}
                        </div>
                        <div key={`${month}-vat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.vat.toFixed(2)}
                        </div>
                        <div key={`${month}-k2`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.k2.toFixed(2)}
                        </div>
                        <div key={`${month}-totno`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.totalWithoutVat.toFixed(2)}
                        </div>
                        <div key={`${month}-actno`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.actualWithoutVat.toFixed(2)}
                        </div>
                        <div key={`${month}-devno`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {(parentCalc.totalWithoutVat - parentCalc.actualWithoutVat).toFixed(2)}
                        </div>
                        <div key={`${month}-totvat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.totalWithVat.toFixed(2)}
                        </div>
                        <div key={`${month}-actvat`} className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                          {parentCalc.actualWithVat.toFixed(2)}
                        </div>
                        <div
                          key={`${month}-devvat`}
                          className={`p-2 border-b text-right bg-gray-50 text-sm ${
                            monthIndex === months.length - 1
                              ? "border-r-4 border-r-gray-400"
                              : "border-r-4 border-r-gray-300"
                          }`}
                        >
                          {(parentCalc.totalWithVat - parentCalc.actualWithVat).toFixed(2)}
                        </div>
                      </>
                    )
                  })}
                  {/* Total columns for parent */}
                  {(() => {
                    const totalCalc = months.reduce(
                      (acc, month) => {
                        const parentCalc = children.reduce(
                          (childAcc, child) => {
                            const vals = calculateValuesForMonth(child.id, month)
                            return {
                              k1WithVat: childAcc.k1WithVat + vals.k1WithVat,
                              k1WithoutVat: childAcc.k1WithoutVat + vals.k1WithoutVat,
                              vat: childAcc.vat + vals.vat,
                              k2: childAcc.k2 + vals.k2,
                              totalWithoutVat: childAcc.totalWithoutVat + vals.totalWithoutVat,
                              totalWithVat: childAcc.totalWithVat + vals.totalWithVat,
                              actualWithoutVat: childAcc.actualWithoutVat + vals.actualWithoutVat,
                              actualWithVat: childAcc.actualWithVat + vals.actualWithVat,
                            }
                          },
                          {
                            k1WithVat: 0,
                            k1WithoutVat: 0,
                            vat: 0,
                            k2: 0,
                            totalWithoutVat: 0,
                            totalWithVat: 0,
                            actualWithoutVat: 0,
                            actualWithVat: 0,
                          },
                        )
                        return {
                          k1WithVat: acc.k1WithVat + parentCalc.k1WithVat,
                          k1WithoutVat: acc.k1WithoutVat + parentCalc.k1WithoutVat,
                          vat: acc.vat + parentCalc.vat,
                          k2: acc.k2 + parentCalc.k2,
                          totalWithoutVat: acc.totalWithoutVat + parentCalc.totalWithoutVat,
                          totalWithVat: acc.totalWithVat + parentCalc.totalWithVat,
                          actualWithoutVat: acc.actualWithoutVat + parentCalc.actualWithoutVat,
                          actualWithVat: acc.actualWithVat + parentCalc.actualWithVat,
                        }
                      },
                      {
                        k1WithVat: 0,
                        k1WithoutVat: 0,
                        vat: 0,
                        k2: 0,
                        totalWithoutVat: 0,
                        totalWithVat: 0,
                        actualWithoutVat: 0,
                        actualWithVat: 0,
                      },
                    )
                    return (
                      <>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.k1WithVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.k1WithoutVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.vat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.k2.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.totalWithoutVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.actualWithoutVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {(totalCalc.totalWithoutVat - totalCalc.actualWithoutVat).toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.totalWithVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r text-right bg-gray-100 text-sm font-semibold">
                          {totalCalc.actualWithVat.toFixed(2)}
                        </div>
                        <div className="p-2 border-b border-r-4 border-r-gray-400 text-right bg-gray-100 text-sm font-semibold">
                          {(totalCalc.totalWithVat - totalCalc.actualWithVat).toFixed(2)}
                        </div>
                      </>
                    )
                  })()}
                  <div className="p-2 border-b bg-gray-50"></div>

                  {/* Child rows with input fields */}
                  {children.map((child) => (
                    <div key={child.id} className="contents">
                      <div className="p-2 border-b border-r-4 border-r-gray-400 pl-8 bg-white sticky left-0 z-20 text-sm">
                        ↳ {child.name}
                      </div>
                      {months.map((month, monthIndex) => {
                        const vals = calculateValuesForMonth(child.id, month)
                        return (
                          <>
                            <div key={`${month}-k1vat`} className="border-b border-r bg-white">
                              {readOnly ? (
                                <div className="p-2 text-right text-sm">{vals.k1WithVat.toFixed(2)}</div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={vals.k1WithVat}
                                  onBlur={(e) =>
                                    handleMultiMonthBudgetChange(child.id, month, "k1_with_vat", e.target.value)
                                  }
                                  className="w-full p-2 text-right text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              )}
                            </div>
                            <div key={`${month}-k1no`} className="border-b border-r bg-white">
                              {readOnly ? (
                                <div className="p-2 text-right text-sm">{vals.k1WithoutVat.toFixed(2)}</div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={vals.k1WithoutVat}
                                  onBlur={(e) =>
                                    handleMultiMonthBudgetChange(child.id, month, "k1_without_vat", e.target.value)
                                  }
                                  className="w-full p-2 text-right text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              )}
                            </div>
                            <div key={`${month}-vat`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.vat.toFixed(2)}
                            </div>
                            <div key={`${month}-k2`} className="border-b border-r bg-white">
                              {readOnly ? (
                                <div className="p-2 text-right text-sm">{vals.k2.toFixed(2)}</div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={vals.k2}
                                  onBlur={(e) => handleMultiMonthBudgetChange(child.id, month, "k2", e.target.value)}
                                  className="w-full p-2 text-right text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              )}
                            </div>
                            <div key={`${month}-totno`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.totalWithoutVat.toFixed(2)}
                            </div>
                            <div key={`${month}-actno`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.actualWithoutVat.toFixed(2)}
                            </div>
                            <div key={`${month}-devno`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {(vals.totalWithoutVat - vals.actualWithoutVat).toFixed(2)}
                            </div>
                            <div key={`${month}-totvat`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.totalWithVat.toFixed(2)}
                            </div>
                            <div key={`${month}-actvat`} className="p-2 border-b border-r text-right bg-white text-sm">
                              {vals.actualWithVat.toFixed(2)}
                            </div>
                            <div
                              key={`${month}-devvat`}
                              className={`p-2 border-b text-right bg-white text-sm ${
                                monthIndex === months.length - 1
                                  ? "border-r-4 border-r-gray-400"
                                  : "border-r-4 border-r-gray-300"
                              }`}
                            >
                              {(vals.totalWithVat - vals.actualWithVat).toFixed(2)}
                            </div>
                          </>
                        )
                      })}
                      {/* Total columns for child */}
                      {(() => {
                        const totalCalc = months.reduce(
                          (acc, month) => {
                            const vals = calculateValuesForMonth(child.id, month)
                            return {
                              k1WithVat: acc.k1WithVat + vals.k1WithVat,
                              k1WithoutVat: acc.k1WithoutVat + vals.k1WithoutVat,
                              vat: acc.vat + vals.vat,
                              k2: acc.k2 + vals.k2,
                              totalWithoutVat: acc.totalWithoutVat + vals.totalWithoutVat,
                              totalWithVat: acc.totalWithVat + vals.totalWithVat,
                              actualWithoutVat: acc.actualWithoutVat + vals.actualWithoutVat,
                              actualWithVat: acc.actualWithVat + vals.actualWithVat,
                            }
                          },
                          {
                            k1WithVat: 0,
                            k1WithoutVat: 0,
                            vat: 0,
                            k2: 0,
                            totalWithoutVat: 0,
                            totalWithVat: 0,
                            actualWithoutVat: 0,
                            actualWithVat: 0,
                          },
                        )
                        return (
                          <>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.k1WithVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.k1WithoutVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.vat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.k2.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.totalWithoutVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.actualWithoutVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {(totalCalc.totalWithoutVat - totalCalc.actualWithoutVat).toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.totalWithVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r text-right bg-gray-50 text-sm">
                              {totalCalc.actualWithVat.toFixed(2)}
                            </div>
                            <div className="p-2 border-b border-r-4 border-r-gray-400 text-right bg-gray-50 text-sm">
                              {(totalCalc.totalWithVat - totalCalc.actualWithVat).toFixed(2)}
                            </div>
                          </>
                        )
                      })()}
                      <div className="p-2 border-b bg-white"></div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderCategoryRows = (parentCategories: Category[], type: "income" | "expense") => {
    const rows: JSX.Element[] = []

    parentCategories.forEach((parent, parentIndex) => {
      const children = categories.filter((c) => c.parent_id === parent.id)
      children.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

      const parentCalculated = children.reduce(
        (acc, child) => {
          const childRow = budgetData[child.id]
          if (!childRow) return acc
          return {
            k1WithVat: acc.k1WithVat + childRow.k1WithVat,
            k1WithoutVat: acc.k1WithoutVat + childRow.k1WithoutVat,
            vat: acc.vat + childRow.vat,
            k2: acc.k2 + childRow.k2,
            totalWithoutVat: acc.totalWithoutVat + childRow.totalWithoutVat,
            totalWithVat: acc.totalWithVat + childRow.totalWithVat,
            actualWithoutVat: acc.actualWithoutVat + childRow.actualWithoutVat,
            actualWithVat: acc.actualWithVat + childRow.actualWithVat,
          }
        },
        {
          k1WithVat: 0,
          k1WithoutVat: 0,
          vat: 0,
          k2: 0,
          totalWithoutVat: 0,
          totalWithVat: 0,
          actualWithoutVat: 0,
          actualWithVat: 0,
        },
      )

      rows.push(
        <div key={parent.id} className="contents">
          <div className="p-3 border-b border-r font-semibold bg-gray-50">
            {editingCategoryId === parent.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleSaveCategoryName(parent.id)}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>{parent.name}</span>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleEditCategory(parent.id, parent.name)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.k1WithVat.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.k1WithoutVat.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.vat.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.k2.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.totalWithoutVat.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.actualWithoutVat.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(parentCalculated.totalWithoutVat - parentCalculated.actualWithoutVat).toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.totalWithVat.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {parentCalculated.actualWithVat.toFixed(2)}
          </div>
          <div
            className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px] font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(parentCalculated.totalWithVat - parentCalculated.actualWithVat).toFixed(2)}
          </div>
          <div className="p-3 border-b bg-gray-50 flex items-center min-h-[48px]">
            {!readOnly && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveUp(parent.id, parentIndex, false)}
                  disabled={parentIndex === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveDown(parent.id, parentIndex, parentCategories.length - 1, false)}
                  disabled={parentIndex === parentCategories.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-red-100"
                  onClick={() => handleDeleteCategory(parent.id, parent.name)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            )}
          </div>
        </div>,
      )

      children.forEach((child, childIndex) => {
        const childRow = budgetData[child.id]
        if (!childRow) return

        rows.push(
          <div key={child.id} className="contents">
            <div className="p-3 border-b border-r font-semibold pl-8 flex items-center min-h-[48px]">
              {editingCategoryId === child.id ? (
                <div className="flex items-center gap-2 w-full">
                  <span>↳</span>
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleSaveCategoryName(child.id)}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                `↳ ${child.name}`
              )}
            </div>
            <div className="border-b border-r bg-gray-50 flex items-center min-h-[48px]">
              <input
                type="number"
                step="0.01"
                value={childRow.k1WithVat.toString()}
                onChange={(e) => handleK1WithVatChange(child.id, e.target.value)}
                onBlur={() => handleSaveSingleCategory(child.id)}
                className="w-full px-3 py-3 text-right border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
            </div>
            <div className="border-b border-r bg-gray-50 flex items-center min-h-[48px]">
              <input
                type="number"
                step="0.01"
                value={childRow.k1WithoutVat.toString()}
                onChange={(e) => handleK1WithoutVatChange(child.id, e.target.value)}
                onBlur={() => handleSaveSingleCategory(child.id)}
                className="w-full px-3 py-3 text-right border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
            </div>
            <div
              className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {childRow.vat.toFixed(2)}
            </div>
            <div className="border-b border-r bg-gray-50 flex items-center min-h-[48px]">
              <input
                type="number"
                step="0.01"
                value={childRow.k2.toString()}
                onChange={(e) => handleK2Change(child.id, e.target.value)}
                onBlur={() => handleSaveSingleCategory(child.id)}
                className="w-full px-3 py-3 text-right border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ fontVariantNumeric: "tabular-nums" }}
              />
            </div>
            <div
              className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {childRow.totalWithoutVat.toFixed(2)}
            </div>
            <div
              className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {childRow.actualWithoutVat.toFixed(2)}
            </div>
            <div
              className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {(childRow.totalWithoutVat - childRow.actualWithoutVat).toFixed(2)}
            </div>
            <div
              className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {childRow.totalWithVat.toFixed(2)}
            </div>
            <div
              className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {childRow.actualWithVat.toFixed(2)}
            </div>
            <div
              className="p-3 border-b border-r text-right bg-gray-50 flex items-center justify-end min-h-[48px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {(childRow.totalWithVat - childRow.actualWithVat).toFixed(2)}
            </div>
            <div className="p-3 border-b bg-gray-50 flex items-center min-h-[48px]">
              {!readOnly && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveUp(child.id, childIndex, true, parent.id)}
                    disabled={childIndex === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveDown(child.id, childIndex, children.length - 1, true, parent.id)}
                    disabled={childIndex === children.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleEditCategory(child.id, child.name)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-red-100"
                    onClick={() => handleDeleteCategory(child.id, child.name)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              )}
            </div>
          </div>,
        )
      })
    })

    return rows
  }

  const calculateSubtotal = (categoryType: "income" | "expense") => {
    const relevantCategories = categories.filter((c) => c.type === categoryType)
    return relevantCategories.reduce(
      (acc, cat) => {
        const row = budgetData[cat.id]
        if (!row) return acc
        return {
          k1WithVat: acc.k1WithVat + row.k1WithVat,
          k1WithoutVat: acc.k1WithoutVat + row.k1WithoutVat,
          vat: acc.vat + row.vat,
          k2: acc.k2 + row.k2,
          totalWithoutVat: acc.totalWithoutVat + row.totalWithoutVat,
          totalWithVat: acc.totalWithVat + row.totalWithVat,
          actualWithoutVat: acc.actualWithoutVat + row.actualWithoutVat,
          actualWithVat: acc.actualWithVat + row.actualWithVat,
        }
      },
      {
        k1WithVat: 0,
        k1WithoutVat: 0,
        vat: 0,
        k2: 0,
        totalWithoutVat: 0,
        totalWithVat: 0,
        actualWithoutVat: 0,
        actualWithVat: 0,
      },
    )
  }

  const incomeSubtotal = calculateSubtotal("income")
  const expenseSubtotal = calculateSubtotal("expense")

  // The original single-month view return statement is now conditionally rendered.
  // The multi-month view is rendered above if isMultiMonth is true.

  if (isMultiMonth) {
    return renderMultiMonthView()
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Budget Overview</h2>
        {!readOnly && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Budget"}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: "200px repeat(11, 1fr)",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {/* Headers - Added border-r for vertical borders */}
          <div className="p-3 border-b border-r font-bold bg-gray-200">Category</div>
          <div className="p-3 border-b border-r font-bold bg-gray-200 text-center">K1 with VAT</div>
          <div className="p-3 border-b border-r font-bold bg-gray-200 text-center">K1 without VAT</div>
          <div className="p-3 border-b border-r font-bold bg-gray-200 text-center">VAT</div>
          <div className="p-3 border-b border-r font-bold bg-gray-200 text-center">K2</div>
          <div className="p-3 border-b border-r font-bold bg-yellow-100 text-center">Total without VAT</div>
          <div className="p-3 border-b border-r font-bold bg-yellow-100 text-center">Actual without VAT</div>
          <div className="p-3 border-b border-r font-bold bg-yellow-100 text-center">Deviation</div>
          <div className="p-3 border-b border-r font-bold bg-blue-100 text-center">Total with VAT</div>
          <div className="p-3 border-b border-r font-bold bg-blue-100 text-center">Actual with VAT</div>
          <div className="p-3 border-b border-r font-bold bg-blue-100 text-center">Deviation</div>
          <div className="p-3 border-b font-bold bg-gray-200 text-center">Actions</div>

          {/* Income section */}
          {renderCategoryRows(incomeCategories, "income")}

          {incomeCategories.length > 0 && (
            <>
              <div className="p-3 border-t-2 border-r font-bold bg-green-100">Тотал приходи</div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.k1WithVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.k1WithoutVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.vat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.k2.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.totalWithoutVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.actualWithoutVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {(incomeSubtotal.totalWithoutVat - incomeSubtotal.actualWithoutVat).toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.totalWithVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {incomeSubtotal.actualWithVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-green-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {(incomeSubtotal.totalWithVat - incomeSubtotal.actualWithVat).toFixed(2)}
              </div>
              <div className="p-3 border-t-2 bg-green-100"></div>
            </>
          )}

          {/* Expense section */}
          {renderCategoryRows(expenseCategories, "expense")}

          {expenseCategories.length > 0 && (
            <>
              <div className="p-3 border-t-2 border-r font-bold bg-red-100">Тотал разходи</div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.k1WithVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.k1WithoutVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.vat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.k2.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.totalWithoutVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.actualWithoutVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {(expenseSubtotal.totalWithoutVat - expenseSubtotal.actualWithoutVat).toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.totalWithVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {expenseSubtotal.actualWithVat.toFixed(2)}
              </div>
              <div
                className="p-3 border-t-2 border-r text-right font-bold bg-red-100 flex items-center justify-end min-h-[48px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {(expenseSubtotal.totalWithVat - expenseSubtotal.actualWithVat).toFixed(2)}
              </div>
              <div className="p-3 border-t-2 bg-red-100"></div>
            </>
          )}

          {/* Grand Total - Added border-r for vertical borders */}
          <div className="p-3 border-t-2 border-r font-bold bg-gray-200">ТОТАЛ</div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.k1WithVat - expenseSubtotal.k1WithVat).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.k1WithoutVat - expenseSubtotal.k1WithoutVat).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.vat - expenseSubtotal.vat).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.k2 - expenseSubtotal.k2).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.totalWithoutVat - expenseSubtotal.totalWithoutVat).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.actualWithoutVat - expenseSubtotal.actualWithoutVat).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(
              incomeSubtotal.totalWithoutVat -
              incomeSubtotal.actualWithoutVat -
              (expenseSubtotal.totalWithoutVat - expenseSubtotal.actualWithoutVat)
            ).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.totalWithVat - expenseSubtotal.totalWithVat).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(incomeSubtotal.actualWithVat - expenseSubtotal.actualWithVat).toFixed(2)}
          </div>
          <div
            className="p-3 border-t-2 border-r text-right font-bold bg-gray-200 flex items-center justify-end min-h-[48px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {(
              incomeSubtotal.totalWithVat -
              incomeSubtotal.actualWithVat -
              (expenseSubtotal.totalWithVat - expenseSubtotal.actualWithVat)
            ).toFixed(2)}
          </div>
          <div className="p-3 border-t-2 bg-gray-200"></div>
        </div>
      </div>
    </div>
  )
}
