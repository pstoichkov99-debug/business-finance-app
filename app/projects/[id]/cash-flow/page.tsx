import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ProjectCashFlowTable } from "@/components/project-cash-flow-table"

export default async function ProjectCashFlowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get project
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single()

  if (!project) {
    return <div>Project not found</div>
  }

  // Get categories
  const { data: categories } = await supabase.from("categories").select("*").order("order_index")

  // Get all budgets for this project
  const { data: budgets } = await supabase.from("budgets").select("*").eq("project_id", id)

  // Get all transactions for this project
  const { data: transactions } = await supabase.from("transactions").select("*").eq("project_id", id)

  // Get existing cash flow schedules
  const { data: schedules } = await supabase
    .from("cash_flow_schedule")
    .select("*")
    .eq("project_id", id)
    .order("scheduled_month")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Planning: {project.name}</h1>
          <p className="text-muted-foreground">Plan when you will pay expenses and receive income</p>
        </div>
      </div>

      <ProjectCashFlowTable
        projectId={id}
        categories={categories || []}
        budgets={budgets || []}
        transactions={transactions || []}
        schedules={schedules || []}
      />
    </div>
  )
}
