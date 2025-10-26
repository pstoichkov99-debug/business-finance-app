"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"

type PeriodType = "monthly" | "annual" | "custom"

export function PeriodSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const periodType = (searchParams.get("periodType") as PeriodType) || "monthly"
  const period = searchParams.get("period") || getCurrentPeriod(periodType)

  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    periodType === "custom" && period.includes("_") ? new Date(period.split("_")[0]) : undefined,
  )
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    periodType === "custom" && period.includes("_") ? new Date(period.split("_")[1]) : undefined,
  )

  function getCurrentPeriod(type: PeriodType): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    if (type === "monthly") {
      return `${year}-${String(month).padStart(2, "0")}`
    } else if (type === "custom") {
      // Default to current month for custom
      const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`
      const endOfMonth = new Date(year, month, 0).toISOString().slice(0, 10)
      return `${startOfMonth}_${endOfMonth}`
    } else {
      return String(year)
    }
  }

  function handlePeriodTypeChange(newType: PeriodType) {
    const newPeriod = getCurrentPeriod(newType)
    router.push(`${pathname}?periodType=${newType}&period=${newPeriod}`)
  }

  function handlePeriodChange(newPeriod: string) {
    router.push(`${pathname}?periodType=${periodType}&period=${newPeriod}`)
  }

  function handleCustomDateRangeApply() {
    if (customStartDate && customEndDate) {
      const startStr = format(customStartDate, "yyyy-MM-dd")
      const endStr = format(customEndDate, "yyyy-MM-dd")
      router.push(`${pathname}?periodType=custom&period=${startStr}_${endStr}`)
    }
  }

  function getMonthOptions() {
    const options = []
    const currentYear = new Date().getFullYear()

    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      for (let month = 1; month <= 12; month++) {
        const value = `${year}-${String(month).padStart(2, "0")}`
        const label = new Date(year, month - 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
        options.push({ value, label })
      }
    }

    return options
  }

  function getYearOptions() {
    const options = []
    const currentYear = new Date().getFullYear()

    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
      options.push({ value: String(year), label: String(year) })
    }

    return options
  }

  return (
    <div className="flex gap-4 items-center">
      <Select value={periodType} onValueChange={handlePeriodTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="annual">Annual</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {periodType === "monthly" && (
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getMonthOptions().map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === "annual" && (
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getYearOptions().map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === "custom" && (
        <div className="flex gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-start text-left font-normal bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "MMM dd, yyyy") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px] justify-start text-left font-normal bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "MMM dd, yyyy") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Button onClick={handleCustomDateRangeApply} disabled={!customStartDate || !customEndDate}>
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}
