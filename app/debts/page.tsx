import { createClient } from "@/lib/supabase/server"
import { DebtsList } from "@/components/debts-list"
import { AddDebtDialog } from "@/components/add-debt-dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function DebtsPage() {
  const supabase = await createClient()

  const { data: debts, error } = await supabase.from("debts").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching debts:", error)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Debts</h1>
              <p className="text-muted-foreground">Track loans and credit obligations</p>
            </div>
          </div>
          <AddDebtDialog />
        </div>

        <DebtsList debts={debts || []} />
      </div>
    </div>
  )
}
