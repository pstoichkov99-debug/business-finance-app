"use client"

import type { Category, CashFlowSchedule } from "@/lib/types"

interface CashFlowSummaryTableProps {
  currentBalance: number
  schedules: (CashFlowSchedule & { categories: Category; projects: { name: string } })[]
  categories: Category[]
}

export function CashFlowSummaryTable({ currentBalance, schedules, categories }: CashFlowSummaryTableProps) {
  // Group schedules by month
  const schedulesByMonth = new Map<string, typeof schedules>()

  schedules.forEach((schedule) => {
    const month = schedule.scheduled_month.slice(0, 7)
    const existing = schedulesByMonth.get(month) || []
    schedulesByMonth.set(month, [...existing, schedule])
  })

  // Get all unique months and sort them
  const months = Array.from(schedulesByMonth.keys()).sort()

  // Calculate monthly cash flow
  const monthlyData = months.map((month) => {
    const monthSchedules = schedulesByMonth.get(month) || []

    let income = 0
    let expenses = 0

    monthSchedules.forEach((schedule) => {
      // Determine if this is income or expense based on category type
      const category = categories.find((c) => c.id === schedule.category_id)
      const parentCategory = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : category

      if (parentCategory?.type === "income") {
        income += schedule.scheduled_amount
      } else if (parentCategory?.type === "expense") {
        expenses += Math.abs(schedule.scheduled_amount)
      }
    })

    return {
      month,
      income,
      expenses,
      netFlow: income - expenses,
      schedules: monthSchedules,
    }
  })

  // Calculate running balance
  let runningBalance = currentBalance
  const dataWithBalance = monthlyData.map((data) => {
    runningBalance += data.netFlow
    return {
      ...data,
      endingBalance: runningBalance,
    }
  })

  // Format month for display
  function formatMonth(monthStr: string) {
    const [year, month] = monthStr.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1)
    return date.toLocaleDateString("bg-BG", { year: "numeric", month: "long" })
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Cash Flow Forecast</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left font-semibold">Month</th>
                <th className="p-3 text-right font-semibold">Income</th>
                <th className="p-3 text-right font-semibold">Expenses</th>
                <th className="p-3 text-right font-semibold">Net Flow</th>
                <th className="p-3 text-right font-semibold">Ending Balance</th>
              </tr>
            </thead>
            <tbody>
              {dataWithBalance.map((data) => (
                <tr key={data.month} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{formatMonth(data.month)}</td>
                  <td className="p-3 text-right text-green-600 font-semibold">{data.income.toFixed(2)}</td>
                  <td className="p-3 text-right text-red-600 font-semibold">{data.expenses.toFixed(2)}</td>
                  <td
                    className={`p-3 text-right font-semibold ${data.netFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {data.netFlow >= 0 ? "+" : ""}
                    {data.netFlow.toFixed(2)}
                  </td>
                  <td
                    className={`p-3 text-right font-bold ${
                      data.endingBalance >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {data.endingBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dataWithBalance.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No cash flow schedules found. Go to individual projects to plan payments and receipts.
          </div>
        )}
      </div>
    </div>
  )
}
