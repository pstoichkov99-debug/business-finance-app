"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"

interface AddExistingCategoryDialogProps {
  categories: Category[]
  existingBudgetCategoryIds: string[]
  projectId: string | null
  selectedMonth: string
  onCategoriesAdded: () => void
}

export function AddExistingCategoryDialog({
  categories,
  existingBudgetCategoryIds,
  projectId,
  selectedMonth,
  onCategoriesAdded,
}: AddExistingCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Filter out categories that already have budgets
  const availableCategories = categories.filter((cat) => !existingBudgetCategoryIds.includes(cat.id))

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleAddCategories = async () => {
    if (selectedCategoryIds.length === 0) {
      alert("Please select at least one category")
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Create budget entries for selected categories
    const budgetEntries = selectedCategoryIds.map((categoryId) => ({
      category_id: categoryId,
      month: selectedMonth.includes("-") ? selectedMonth + "-01" : selectedMonth,
      project_id: projectId,
      k1_with_vat: 0,
      k1_without_vat: 0,
      vat: 0,
      k2: 0,
      total_without_vat: 0,
      total_with_vat: 0,
    }))

    const { error } = await supabase.from("budgets").insert(budgetEntries)

    if (error) {
      console.error("Error adding categories to budget:", error)
      alert("Error adding categories: " + (error?.message || "Unknown error"))
      setLoading(false)
      return
    }

    setLoading(false)
    setSelectedCategoryIds([])
    setOpen(false)
    onCategoriesAdded()
  }

  const incomeCategories = availableCategories.filter((c) => c.type === "income")
  const expenseCategories = availableCategories.filter((c) => c.type === "expense")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Existing Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Categories to Budget</DialogTitle>
        </DialogHeader>

        {availableCategories.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>All categories are already in this budget.</p>
            <p className="mt-2">Create new categories from the Categories page.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {incomeCategories.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-green-700">Income Categories</h3>
                <div className="space-y-2">
                  {incomeCategories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={category.id}
                        checked={selectedCategoryIds.includes(category.id)}
                        onCheckedChange={() => handleToggleCategory(category.id)}
                      />
                      <label htmlFor={category.id} className="flex-1 cursor-pointer">
                        {category.parent_id ? `↳ ${category.name}` : category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expenseCategories.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-red-700">Expense Categories</h3>
                <div className="space-y-2">
                  {expenseCategories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={category.id}
                        checked={selectedCategoryIds.includes(category.id)}
                        onCheckedChange={() => handleToggleCategory(category.id)}
                      />
                      <label htmlFor={category.id} className="flex-1 cursor-pointer">
                        {category.parent_id ? `↳ ${category.name}` : category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">{selectedCategoryIds.length} categories selected</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleAddCategories} disabled={loading || selectedCategoryIds.length === 0}>
                  {loading ? "Adding..." : `Add ${selectedCategoryIds.length} Categories`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
