"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function GenerateRecurringButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/generate-recurring-transactions", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Successfully generated ${data.generated} recurring transactions`)
        router.refresh()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert("Error generating recurring transactions")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} variant="outline">
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Generating..." : "Generate Recurring"}
    </Button>
  )
}
