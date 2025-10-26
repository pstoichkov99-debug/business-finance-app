"use client"

import type { Asset } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Building2 } from "lucide-react"
import { EditAssetDialog } from "@/components/edit-asset-dialog"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AssetsListProps {
  assets: Asset[]
}

export function AssetsList({ assets: initialAssets }: AssetsListProps) {
  const [assets, setAssets] = useState(initialAssets)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return

    const supabase = createClient()
    const { error } = await supabase.from("assets").delete().eq("id", id)

    if (error) {
      alert("Error deleting asset: " + (error?.message || "Unknown error"))
      return
    }

    setAssets(assets.filter((asset) => asset.id !== id))
    router.refresh()
  }

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0)

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No assets tracked</p>
        <p className="text-sm text-muted-foreground">Add your first asset to start tracking</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground mb-1">Total Asset Value</p>
        <p className="text-3xl font-bold text-green-600">{totalValue.toFixed(2)} BGN</p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {asset.name}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{asset.type}</TableCell>
                <TableCell className="text-right font-semibold">{asset.value.toFixed(2)}</TableCell>
                <TableCell>{asset.currency}</TableCell>
                <TableCell>{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{asset.notes || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingAsset(asset)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingAsset && (
        <EditAssetDialog
          asset={editingAsset}
          open={!!editingAsset}
          onOpenChange={(open) => !open && setEditingAsset(null)}
          onSuccess={() => {
            setEditingAsset(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
