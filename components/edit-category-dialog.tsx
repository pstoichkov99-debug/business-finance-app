"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Category } from "@/lib/types"
import { Plus } from "lucide-react"

interface EditCategoryDialogProps {
  category: Category
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryDeleted?: () => void
}

export function EditCategoryDialog({ category, open, onOpenChange, onCategoryDeleted }: EditCategoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(category.name)
  const [type, setType] = useState<"income" | "expense">(category.type || "expense")
  const [parentId, setParentId] = useState<string | null>(category.parent_id)
  const [categories, setCategories] = useState<Category[]>([])
  const [showNewParent, setShowNewParent] = useState(false)
  const [newParentName, setNewParentName] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        const supabase = createClient()
        const { data } = await supabase.from("categories").select("*").neq("id", category.id).order("order_index")
        if (data) setCategories(data)
      }
      fetchCategories()
    }
  }, [open, category.id])

  const handleCreateParent = async () => {
    if (!newParentName.trim()) return

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: newParentName,
        type: type,
        parent_id: null,
      })
      .select()
      .single()

    if (error) {
      alert("Error creating parent category: " + (error?.message || "Unknown error"))
      setLoading(false)
      return
    }

    // Refresh categories list
    const { data: updatedCategories } = await supabase
      .from("categories")
      .select("*")
      .neq("id", category.id)
      .order("order_index")
    if (updatedCategories) setCategories(updatedCategories)

    // Set the newly created category as parent
    setParentId(data.id)
    setShowNewParent(false)
    setNewParentName("")
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from("categories")
      .update({
        name,
        type,
        parent_id: parentId,
      })
      .eq("id", category.id)

    if (error) {
      alert("Error updating category: " + (error?.message || "Unknown error"))
      setLoading(false)
      return
    }

    onOpenChange(false)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async () => {
    console.log("[v0] Starting category deletion for:", category.id)

    if (!confirm("Are you sure you want to delete this category? This will also delete all associated budgets.")) {
      console.log("[v0] Category deletion cancelled by user")
      return
    }

    setLoading(true)
    const supabase = createClient()

    console.log("[v0] Deleting associated budgets...")
    // First, delete all budgets associated with this category
    const { error: budgetsError } = await supabase.from("budgets").delete().eq("category_id", category.id)

    if (budgetsError) {
      console.log("[v0] Error deleting budgets:", budgetsError)
      alert("Error deleting associated budgets: " + (budgetsError?.message || "Unknown error"))
      setLoading(false)
      return
    }

    console.log("[v0] Updating transactions to remove category reference...")
    // Set category_id to null for all transactions (don't delete transactions)
    const { error: transactionsError } = await supabase
      .from("transactions")
      .update({ category_id: null })
      .eq("category_id", category.id)

    if (transactionsError) {
      console.log("[v0] Error updating transactions:", transactionsError)
      alert("Error updating transactions: " + (transactionsError?.message || "Unknown error"))
      setLoading(false)
      return
    }

    console.log("[v0] Deleting subcategories...")
    // Delete any child categories (subcategories)
    const { error: childrenError } = await supabase.from("categories").delete().eq("parent_id", category.id)

    if (childrenError) {
      console.log("[v0] Error deleting subcategories:", childrenError)
      alert("Error deleting subcategories: " + (childrenError?.message || "Unknown error"))
      setLoading(false)
      return
    }

    console.log("[v0] Deleting category itself...")
    // Finally, delete the category itself
    const { error } = await supabase.from("categories").delete().eq("id", category.id)

    if (error) {
      console.log("[v0] Error deleting category:", error)
      alert("Error deleting category: " + (error?.message || "Unknown error"))
      setLoading(false)
      return
    }

    console.log("[v0] Category deleted successfully!")

    if (onCategoryDeleted) {
      onCategoryDeleted()
    }

    onOpenChange(false)
    setLoading(false)
    router.refresh()
  }

  const parentCategories = categories.filter((c) => !c.parent_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>Update category details or delete it</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              placeholder="e.g., Marketing, Salaries, Office Supplies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Category Type</Label>
            <Select value={type} onValueChange={(value: "income" | "expense") => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income (Приход)</SelectItem>
                <SelectItem value="expense">Expense (Разход)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Parent Category (Optional)</Label>
            {!showNewParent ? (
              <>
                <Select
                  value={parentId || "none"}
                  onValueChange={(value) => setParentId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top-level category)</SelectItem>
                    {parentCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewParent(true)}
                  className="mt-2 w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Parent Category
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="New parent category name"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateParent}
                    disabled={loading || !newParentName.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNewParent(false)
                      setNewParentName("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-2">
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
