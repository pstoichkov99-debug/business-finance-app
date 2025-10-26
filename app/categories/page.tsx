import { createClient } from "@/lib/supabase/server"
import { CategoriesList } from "@/components/categories-list"
import { AddCategoryDialog } from "@/components/add-category-dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase.from("categories").select("*").order("order_index")

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
              <h1 className="text-3xl font-bold">Categories</h1>
              <p className="text-muted-foreground">Manage income and expense categories</p>
            </div>
          </div>
          <AddCategoryDialog />
        </div>

        <CategoriesList categories={categories || []} />
      </div>
    </div>
  )
}
