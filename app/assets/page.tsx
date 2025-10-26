import { createClient } from "@/lib/supabase/server"
import { AssetsList } from "@/components/assets-list"
import { AddAssetDialog } from "@/components/add-asset-dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function AssetsPage() {
  const supabase = await createClient()

  const { data: assets, error } = await supabase.from("assets").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching assets:", error)
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
              <h1 className="text-3xl font-bold">Assets</h1>
              <p className="text-muted-foreground">Manage your business assets</p>
            </div>
          </div>
          <AddAssetDialog />
        </div>

        <AssetsList assets={assets || []} />
      </div>
    </div>
  )
}
