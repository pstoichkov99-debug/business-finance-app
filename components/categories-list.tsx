"use client"

import { useState } from "react"
import type { Category } from "@/lib/types"
import { EditCategoryDialog } from "@/components/edit-category-dialog"
import { Button } from "@/components/ui/button"
import { Pencil, ChevronDown, ChevronRight } from "lucide-react"

interface CategoriesListProps {
  categories: Category[]
}

export function CategoriesList({ categories: initialCategories }: CategoriesListProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // Separate income and expense categories
  const incomeCategories = categories.filter((c) => c.type === "income")
  const expenseCategories = categories.filter((c) => c.type === "expense")

  // Get parent and child categories
  const getParentCategories = (cats: Category[]) => cats.filter((c) => !c.parent_id)
  const getChildCategories = (cats: Category[], parentId: string) => cats.filter((c) => c.parent_id === parentId)

  const renderCategoryRow = (category: Category, isChild = false) => {
    const children = getChildCategories(categories, category.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedCategories.has(category.id)

    return (
      <div key={category.id}>
        <div
          className={`grid grid-cols-[1fr_200px_100px] border-b border-gray-300 hover:bg-muted/50 transition-colors ${
            isChild ? "bg-muted/20" : "bg-background"
          }`}
        >
          {/* Category Name Column */}
          <div className={`flex items-center gap-2 p-4 border-r border-gray-300 ${isChild ? "pl-12" : ""}`}>
            {hasChildren && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(category.id)}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}
            <span className={`font-medium ${isChild ? "text-sm" : "text-base"}`}>{category.name}</span>
          </div>

          {/* Type Column */}
          <div className="flex items-center p-4 border-r border-gray-300">
            <span className="text-sm text-muted-foreground">{category.type === "income" ? "Income" : "Expense"}</span>
          </div>

          {/* Actions Column */}
          <div className="flex items-center justify-center p-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(category)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && children.map((child) => renderCategoryRow(child, true))}
      </div>
    )
  }

  const handleCategoryDeleted = () => {
    console.log("[v0] Category deleted, removing from state:", editingCategory?.id)
    if (editingCategory) {
      // Remove the deleted category and its children from state
      setCategories((prev) => prev.filter((c) => c.id !== editingCategory.id && c.parent_id !== editingCategory.id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Income Categories */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-green-50 border-b border-green-200 p-4">
          <h2 className="text-xl font-bold text-green-900">Income Categories</h2>
        </div>
        <div className="grid grid-cols-[1fr_200px_100px] bg-muted/50 border-b border-gray-300">
          <div className="p-3 font-semibold text-sm border-r border-gray-300">Category Name</div>
          <div className="p-3 font-semibold text-sm border-r border-gray-300">Type</div>
          <div className="p-3 font-semibold text-sm text-center">Actions</div>
        </div>
        <div>
          {getParentCategories(incomeCategories).length > 0 ? (
            getParentCategories(incomeCategories).map((category) => renderCategoryRow(category))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No income categories yet. Click "Add Category" to create one.
            </div>
          )}
        </div>
      </div>

      {/* Expense Categories */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-red-50 border-b border-red-200 p-4">
          <h2 className="text-xl font-bold text-red-900">Expense Categories</h2>
        </div>
        <div className="grid grid-cols-[1fr_200px_100px] bg-muted/50 border-b border-gray-300">
          <div className="p-3 font-semibold text-sm border-r border-gray-300">Category Name</div>
          <div className="p-3 font-semibold text-sm border-r border-gray-300">Type</div>
          <div className="p-3 font-semibold text-sm text-center">Actions</div>
        </div>
        <div>
          {getParentCategories(expenseCategories).length > 0 ? (
            getParentCategories(expenseCategories).map((category) => renderCategoryRow(category))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No expense categories yet. Click "Add Category" to create one.
            </div>
          )}
        </div>
      </div>

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => {
            if (!open) setEditingCategory(null)
          }}
          onCategoryDeleted={handleCategoryDeleted}
        />
      )}
    </div>
  )
}
