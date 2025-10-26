import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  try {
    // Get all recurring transactions
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("is_recurring", true)
      .is("parent_transaction_id", null) // Only get parent templates, not generated ones

    if (fetchError) {
      console.error("[v0] Error fetching recurring transactions:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!recurringTransactions || recurringTransactions.length === 0) {
      return NextResponse.json({ message: "No recurring transactions found", generated: 0 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let generatedCount = 0

    for (const template of recurringTransactions) {
      const transactionDate = new Date(template.transaction_date)
      const endDate = template.recurrence_end_date ? new Date(template.recurrence_end_date) : null

      // Calculate next occurrence date
      const nextDate = new Date(transactionDate)
      const interval = template.recurrence_interval || 1

      while (nextDate <= today) {
        // Move to next occurrence
        if (template.recurrence_frequency === "weekly") {
          nextDate.setDate(nextDate.getDate() + 7 * interval)
        } else if (template.recurrence_frequency === "monthly") {
          nextDate.setMonth(nextDate.getMonth() + interval)
        } else if (template.recurrence_frequency === "yearly") {
          nextDate.setFullYear(nextDate.getFullYear() + interval)
        }

        // Check if we should generate this occurrence
        if (nextDate <= today && (!endDate || nextDate <= endDate)) {
          // Check if this transaction already exists
          const { data: existing } = await supabase
            .from("transactions")
            .select("id")
            .eq("parent_transaction_id", template.id)
            .eq("transaction_date", nextDate.toISOString().split("T")[0])
            .single()

          if (!existing) {
            // Generate new transaction
            const newTransaction = {
              transaction_date: nextDate.toISOString().split("T")[0],
              pl_date: nextDate.toISOString().split("T")[0],
              account_id: template.account_id,
              type: template.type,
              category_id: template.category_id,
              debt_id: template.debt_id,
              project_id: template.project_id,
              to_account_id: template.to_account_id,
              amount_with_vat: template.amount_with_vat,
              amount_without_vat: template.amount_without_vat,
              vat_amount: template.vat_amount,
              k2_amount: template.k2_amount,
              notes: template.notes ? `${template.notes} (Auto-generated)` : "Auto-generated recurring transaction",
              is_recurring: false,
              parent_transaction_id: template.id,
            }

            const { error: insertError } = await supabase.from("transactions").insert(newTransaction)

            if (insertError) {
              console.error("[v0] Error generating transaction:", insertError)
            } else {
              generatedCount++
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: `Successfully generated ${generatedCount} recurring transactions`,
      generated: generatedCount,
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json({ error: "Unexpected error occurred" }, { status: 500 })
  }
}
