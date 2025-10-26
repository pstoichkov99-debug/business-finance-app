"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ForecastChartProps {
  currentBalance: number
  recurringTransactions: any[]
}

export function ForecastChart({ currentBalance, recurringTransactions }: ForecastChartProps) {
  const [period, setPeriod] = useState("3")

  const forecastData = useMemo(() => {
    const months = Number.parseInt(period)
    const data: any[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let runningBalance = currentBalance

    // Add current balance as first data point
    data.push({
      date: today.toISOString().split("T")[0],
      balance: runningBalance,
      income: 0,
      expense: 0,
      label: "Today",
    })

    // Generate forecast for each month
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(today)
      forecastDate.setMonth(forecastDate.getMonth() + i)

      let monthIncome = 0
      let monthExpense = 0

      // Calculate expected transactions for this month
      for (const transaction of recurringTransactions) {
        const transactionDate = new Date(transaction.transaction_date)
        const endDate = transaction.recurrence_end_date ? new Date(transaction.recurrence_end_date) : null

        // Check if this recurring transaction applies to this forecast month
        if (endDate && forecastDate > endDate) {
          continue // Transaction has ended
        }

        const interval = transaction.recurrence_interval || 1
        let occurrences = 0

        if (transaction.recurrence_frequency === "weekly") {
          occurrences = Math.floor((30 * i) / (7 * interval))
        } else if (transaction.recurrence_frequency === "monthly") {
          occurrences = Math.floor(i / interval)
        } else if (transaction.recurrence_frequency === "yearly") {
          occurrences = i >= 12 * interval ? 1 : 0
        }

        if (occurrences > 0) {
          const amount = Math.abs(
            (transaction.amount_with_vat || transaction.amount_without_vat || 0) + (transaction.k2_amount || 0),
          )

          if (transaction.type === "income") {
            monthIncome += amount * occurrences
          } else if (transaction.type === "expense") {
            monthExpense += amount * occurrences
          }
        }
      }

      runningBalance = runningBalance + monthIncome - monthExpense

      data.push({
        date: forecastDate.toISOString().split("T")[0],
        balance: runningBalance,
        income: monthIncome,
        expense: monthExpense,
        label: `Month ${i}`,
      })
    }

    return data
  }, [period, currentBalance, recurringTransactions])

  const finalBalance = forecastData[forecastData.length - 1]?.balance || currentBalance
  const totalIncome = forecastData.reduce((sum, d) => sum + d.income, 0)
  const totalExpense = forecastData.reduce((sum, d) => sum + d.expense, 0)
  const netChange = finalBalance - currentBalance

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cash Flow Projection</CardTitle>
              <CardDescription>Forecast based on recurring transactions</CardDescription>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Month</SelectItem>
                <SelectItem value="3">3 Months</SelectItem>
                <SelectItem value="6">6 Months</SelectItem>
                <SelectItem value="12">12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(2)} BGN`}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} name="Projected Balance" />
              <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} name="Expected Income" />
              <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} name="Expected Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{currentBalance.toFixed(2)} BGN</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Projected Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{finalBalance.toFixed(2)} BGN</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expected Income</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">+{totalIncome.toFixed(2)} BGN</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Expected Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">-{totalExpense.toFixed(2)} BGN</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Details</CardTitle>
          <CardDescription>Month-by-month breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Expected Income</TableHead>
                <TableHead className="text-right">Expected Expenses</TableHead>
                <TableHead className="text-right">Net Change</TableHead>
                <TableHead className="text-right">Projected Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecastData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right text-green-600">+{row.income.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600">-{row.expense.toFixed(2)}</TableCell>
                  <TableCell
                    className={`text-right ${row.income - row.expense >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {(row.income - row.expense >= 0 ? "+" : "") + (row.income - row.expense).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{row.balance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className={`border-2 ${netChange >= 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
        <CardHeader>
          <CardTitle>Forecast Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg">
              Over the next <span className="font-bold">{period} months</span>, your balance is projected to{" "}
              {netChange >= 0 ? "increase" : "decrease"} by{" "}
              <span className={`font-bold ${netChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Math.abs(netChange).toFixed(2)} BGN
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              This forecast is based on {recurringTransactions.length} recurring transaction
              {recurringTransactions.length !== 1 ? "s" : ""} and assumes they continue as scheduled.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
