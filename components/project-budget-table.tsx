"use client"

import type { Category, Budget, Transaction } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"

interface ProjectBudgetTableProps {
  projectId: string
  categories: Category[]
  budgets: Budget[]
  transactions: Transaction[]
}

interface BudgetRow {
  categoryId: string
  categoryName: string
  k1WithVat: number
  k1WithoutVat: number
  vat: number
  k2: number
  totalWithoutVat: number
  totalWithVat: number
  actualWithVat: number
  deviation: number
}

export function ProjectBudgetTable({ projectId, categories, budgets, transactions }: ProjectBudgetTableProps) {
  const [budgetData, setBudgetData] = useState<Record<string, BudgetRow>>({})
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const data: Record<string, BudgetRow> = {}

    categories.forEach((category) => {
      const budget = budgets.find((b) => b.category_id === category.id)
      const categoryTransactions = transactions.filter((t) => t.category_id === category.id)

      const actualWithVat = categoryTransactions.reduce((sum, t) => {
        if ((t.vat_amount || 0) > 0) {
          return sum + Math.abs(t.amount_with_vat || 0) + Math.abs(t.k2_amount || 0)
        }
        return sum
      }, 0)

      const k1WithVat = budget?.k1_with_vat || 0
      const k1WithoutVat = budget?.k1_without_vat || 0
      const vat = budget?.vat || 0
      const k2 = budget?.k2 || 0
      const totalWithoutVat = k1WithoutVat + k2
      const totalWithVat = k1WithVat + k2

      data[category.id] = {
        categoryId: category.id,
        categoryName: category.name,
        k1WithVat,
        k1WithoutVat,
        vat,
        k2,
        totalWithoutVat,
        totalWithVat,
        actualWithVat,
        deviation: totalWithVat - actualWithVat,
      }
    })

    setBudgetData(data)
  }, [categories, budgets, transactions])

  const handleK1WithVatChange = (categoryId: string, value: string) => {
    const withVat = Number.parseFloat(value) || 0
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
        deviation: withVat + prev[categoryId].k2 - prev[categoryId].actualWithVat,
      },
    }))
  }

  const handleK2Change = (categoryId: string, value: string) => {
    const k2 = Number.parseFloat(value) || 0

    setBudgetData((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        k2,
        totalWithoutVat: prev[categoryId].k1WithoutVat + k2,
        totalWithVat: prev[categoryId].k1WithVat + k2,
        deviation: prev[categoryId].k1WithVat + k2 - prev[categoryId].actualWithVat,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    for (const row of Object.values(budgetData)) {
      const { error } = await supabase.from("budgets").upsert(
        {
          category_id: row.categoryId,
          month: new Date().toISOString().slice(0, 7) + "-01",
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
        alert("Error saving budget: " + (error?.message || "Unknown error"))
        setSaving(false)
        return
      }
    }

    setSaving(false)
    router.refresh()
  }

  const totals = Object.values(budgetData).reduce(
    (acc, row) => ({
      totalWithVat: acc.totalWithVat + row.totalWithVat,
      actualWithVat: acc.actualWithVat + row.actualWithVat,
      deviation: acc.deviation + row.deviation,
    }),
    { totalWithVat: 0, actualWithVat: 0, deviation: 0 },
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Budget</CardTitle>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Budget"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Category</TableHead>
                <TableHead className="text-right">K1 with VAT</TableHead>
                <TableHead className="text-right">K2</TableHead>
                <TableHead className="text-right">Total Budget</TableHead>
                <TableHead className="text-right">Actual Spent</TableHead>
                <TableHead className="text-right">Deviation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => {
                const row = budgetData[category.id]
                if (!row) return null

                return (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{row.categoryName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.k1WithVat || ""}
                        onChange={(e) => handleK1WithVatChange(category.id, e.target.value)}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.k2 || ""}
                        onChange={(e) => handleK2Change(category.id, e.target.value)}
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.totalWithVat.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.actualWithVat.toFixed(2)}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${row.deviation < 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {row.deviation.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{totals.totalWithVat.toFixed(2)}</TableCell>
                <TableCell className="text-right">{totals.actualWithVat.toFixed(2)}</TableCell>
                <TableCell className={`text-right ${totals.deviation < 0 ? "text-red-600" : "text-green-600"}`}>
                  {totals.deviation.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
