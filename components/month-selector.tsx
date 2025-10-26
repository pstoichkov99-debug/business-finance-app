"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MonthSelectorProps {
  selectedMonth: string
}

export function MonthSelector({ selectedMonth }: MonthSelectorProps) {
  const months = []
  const currentDate = new Date()

  for (let i = -6; i <= 6; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const monthStr = `${year}-${month}`

    months.push({
      value: monthStr,
      label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    })
  }

  return (
    <Select
      value={selectedMonth}
      onValueChange={(value) => {
        console.log("[v0] Month selector - changing to:", value)
        window.location.href = `/budget?month=${value}`
      }}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((month) => (
          <SelectItem key={month.value} value={month.value}>
            {month.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
