"use client"

import { useRouter } from "next/navigation"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"

interface AddCategoryDialogProps {
  onCategoryAdded?: () => void
}

export function AddCategoryDialog({ onCategoryAdded }: AddCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<"income" | "expense">("expense")
  const [parentId, setParentId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const router = useRouter()

  useEffect(() => {
    if (open) {
      const fetchCategories = async () => {
        const supabase = createClient()
        const { data } = await supabase.from("categories").select("*").order("order_index")
        if (data) setCategories(data)
      }
      fetchCategories()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { data: maxOrderData } = await supabase
      .from("categories")
      .select("order_index")
      .eq("type", type)
      .order("order_index", { ascending: false })
      .limit(1)

    const maxOrder = maxOrderData?.[0]?.order_index || 0

    const { error } = await supabase.from("categories").insert({
      name,
      type,
      parent_id: parentId,
      order_index: maxOrder + 1,
    })

    if (error) {
      alert("Error creating category: " + (error?.message || "Unknown error"))
      setLoading(false)
      return
    }

    setName("")
    setType("expense")
    setParentId(null)
    setOpen(false)
    setLoading(false)

    if (onCategoryAdded) {
      onCategoryAdded()
    }
  }

  const parentCategories = categories.filter((c) => !c.parent_id)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>Create a new budget category or subcategory</DialogDescription>
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
            <Select value={parentId || "none"} onValueChange={(value) => setParentId(value === "none" ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top-level category)</SelectItem>
                {parentCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
