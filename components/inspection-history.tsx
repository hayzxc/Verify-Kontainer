"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Trash2 } from "lucide-react"
import { useState } from "react"
import type { Inspection } from "@/types/inspection"

interface InspectionHistoryProps {
  inspections: Inspection[]
  onSelect: (inspection: Inspection) => void
}

export function InspectionHistory({ inspections, onSelect }: InspectionHistoryProps) {
  const [localInspections, setLocalInspections] = useState<Inspection[]>(inspections)

  const handleDelete = (id: number) => {
    if (confirm("Yakin ingin menghapus inspeksi ini?")) {
      const updated = localInspections.filter((item) => item.id !== id)
      setLocalInspections(updated)
      // In a real app, this should call an API to delete
      // localStorage.setItem("inspections", JSON.stringify(updated))
    }
  }

  if (localInspections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground py-8">Belum ada riwayat inspeksi</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {localInspections.map((inspection) => (
        <Card key={inspection.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{inspection.shipperName}</h3>
                  <Badge variant="outline">{inspection.photos.containerNumber || "No Container"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{inspection.timestamp}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge>{inspection.commodityType}</Badge>
                  {inspection.photos.ispm && <Badge variant="secondary">ISPM</Badge>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onSelect(inspection)} className="gap-2">
                  <Eye className="w-4 h-4" />
                  Lihat
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(inspection.id)} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
