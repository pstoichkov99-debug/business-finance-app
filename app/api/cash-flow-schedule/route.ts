import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"

export async function GET() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("cash_flow_schedule")
    .select("*, categories(*), projects(*)")
    .order("scheduled_month")

  if (error) {
    console.error("[v0] Supabase fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  const body = await request.json()
  const { schedules } = body

  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return NextResponse.json({ error: "Invalid schedules data" }, { status: 400 })
  }

  const schedulesToInsert = []

  for (const schedule of schedules) {
    const { project_id, category_id, scheduled_amount, scheduled_month } = schedule

    // Get budget and actual amounts for this category
    const { data: budgets } = await supabase
      .from("budgets")
      .select("*")
      .eq("project_id", project_id)
      .eq("category_id", category_id)

    const budgetedAmount = (budgets || []).reduce((sum, b) => sum + (b.k1_with_vat || b.k1_without_vat || 0), 0)

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("project_id", project_id)
      .eq("category_id", category_id)

    const actualAmount = (transactions || []).reduce(
      (sum, t) => sum + Math.abs(t.amount_with_vat || t.amount_without_vat || 0),
      0,
    )

    const remainingAmount = budgetedAmount - actualAmount

    schedulesToInsert.push({
      user_id: DEFAULT_USER_ID,
      project_id,
      category_id,
      budgeted_amount: budgetedAmount,
      actual_amount: actualAmount,
      remaining_amount: remainingAmount,
      scheduled_month,
      scheduled_amount,
    })
  }

  const { data, error } = await supabase.from("cash_flow_schedule").insert(schedulesToInsert).select()

  if (error) {
    console.error("[v0] Supabase insert error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = createAdminClient()

  const body = await request.json()
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from("cash_flow_schedule")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = createAdminClient()

  const body = await request.json()
  const { id } = body

  const { error } = await supabase.from("cash_flow_schedule").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
