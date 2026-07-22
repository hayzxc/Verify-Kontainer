"use client"
// Force rebuild

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Printer, Loader2 } from "lucide-react"
import { useRef } from "react"
import type { Inspection } from "@/types/inspection"

export function VerificationDocument({ inspections }: { inspections: Inspection[] }) {
  const documentRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [inspectionsWithAddress, setInspectionsWithAddress] = useState<Inspection[]>(inspections)

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "ContainerInspectionApp/1.0",
          },
        }
      )
      const data = await response.json()
      if (data && data.address) {
        return {
          name: data.name || data.display_name.split(",")[0],
          street: data.address.road || data.address.pedestrian,
          city: data.address.city || data.address.town || data.address.village || data.address.county,
          province: data.address.state || data.address.region,
          postalCode: data.address.postcode,
          formatted: data.display_name,
        }
      }
    } catch (error) {
      console.error("Error fetching address:", error)
    }
    return undefined
  }

  useEffect(() => {
    const enrichInspections = async () => {
      setIsEnriching(true)
      try {
        const updatedInspections = await Promise.all(
          inspections.map(async (inspection) => {
            let currentInspection = { ...inspection }

            // 1. Fetch full details if photos are missing (list API excludes photos)
            if (!currentInspection.photos) {
              try {
                const res = await fetch(`/api/inspections/${inspection.id}`, {
                  credentials: "include",
                })
                if (res.ok) {
                  const fullData = await res.json()
                  currentInspection = { ...currentInspection, ...fullData }
                }
              } catch (e) {
                console.error(`Failed to fetch full details for inspection ${inspection.id}:`, e)
              }
            }

            // 2. Fetch address from OSM if missing
            if (
              currentInspection.location &&
              (!currentInspection.location.address || !currentInspection.location.address.street)
            ) {
              if (currentInspection.location.latitude && currentInspection.location.longitude) {
                const address = await fetchAddress(
                  currentInspection.location.latitude,
                  currentInspection.location.longitude
                )
                if (address) {
                  currentInspection = {
                    ...currentInspection,
                    location: {
                      ...currentInspection.location!,
                      address,
                    },
                  }
                }
              }
            }
            return currentInspection
          })
        )
        setInspectionsWithAddress(updatedInspections)
      } finally {
        setIsEnriching(false)
      }
    }

    if (inspections.length > 0) {
      enrichInspections()
    } else {
      setInspectionsWithAddress([])
    }
  }, [inspections])

  const handlePrintPDF = async () => {
    if (!documentRef.current) return

    setIsGenerating(true)
    try {
      const html2pdfModule = await import("html2pdf.js")
      const html2pdf = html2pdfModule.default || html2pdfModule

      const element = documentRef.current
      const dateStr = new Date().toISOString().split('T')[0]
      const opt = {
        margin: 5,
        filename: `Dokumen-Verifikasi-Bulk-${dateStr}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "landscape" as const, unit: "mm", format: "a4" },
      }

      // @ts-ignore
      html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Gagal membuat PDF")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    if (!documentRef.current) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Inspection</title>
          <style>
            body { font-family: sans-serif; margin: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
            th, td { border: 1px solid #ccc; padding: 4px; text-align: left; vertical-align: top; }
            img { width: 100%; height: 100px; object-fit: contain; display: block; margin: 2px auto; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .text-sm { font-size: 0.75rem; }
            .text-xs { font-size: 0.7rem; }
            .mb-1 { margin-bottom: 2px; }
            .mb-2 { margin-bottom: 4px; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-400 { color: #9ca3af; }
            .text-blue-600 { color: #2563eb; }
            .italic { font-style: italic; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .pt-2 { padding-top: 0.25rem; }
            p { margin: 0 0 2px 0; }
            .break-all { word-break: break-all; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            h1 { font-size: 1.125rem; margin-bottom: 0.5rem; margin-top: 0; text-align: center; }
          </style>
        </head>
        <body>
          ${documentRef.current.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()

    // Wait for all images to finish decoding before triggering print
    const images = Array.from(printWindow.document.querySelectorAll("img"))
    if (images.length === 0) {
      printWindow.focus()
      printWindow.print()
      return
    }

    let loadedCount = 0
    const tryPrint = () => {
      loadedCount++
      if (loadedCount >= images.length) {
        printWindow.focus()
        printWindow.print()
      }
    }

    images.forEach((img) => {
      if (img.complete) {
        tryPrint()
      } else {
        img.addEventListener("load", tryPrint)
        img.addEventListener("error", tryPrint) // also advance on broken images
      }
    })
  }

  const isBusy = isEnriching || isGenerating

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end items-center">
        {isEnriching && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat foto...
          </span>
        )}
        <Button onClick={handlePrint} variant="outline" disabled={isBusy}>
          <Printer className="w-4 h-4 mr-2" />
          Cetak
        </Button>
        <Button onClick={handlePrintPDF} disabled={isBusy}>
          <Download className="w-4 h-4 mr-2" />
          {isGenerating ? "Membuat PDF..." : "Unduh PDF"}
        </Button>
      </div>

      <div className="overflow-auto">
        <Card ref={documentRef} className="bg-white text-black p-2 w-full">
          <div className="space-y-2">
            <div className="border-b border-gray-300 pb-1">
              <h1 className="text-lg font-bold text-center m-0">Dokumen Verifikasi Container</h1>
            </div>

            <table className="w-full text-xs border-collapse border border-gray-300 table-fixed">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-1 text-left w-[15%]" style={{ width: "15%" }}>Shipper & Komoditi</th>
                  <th className="border border-gray-300 p-1 text-center w-[12.5%]" style={{ width: "12.5%" }}>Foto Container</th>
                  <th className="border border-gray-300 p-1 text-center w-[12.5%]" style={{ width: "12.5%" }}>Foto Komoditi</th>
                  <th className="border border-gray-300 p-1 text-center w-[12.5%]" style={{ width: "12.5%" }}>Foto Packing</th>
                  <th className="border border-gray-300 p-1 text-center w-[12.5%]" style={{ width: "12.5%" }}>Foto ISPM</th>
                  <th className="border border-gray-300 p-1 text-left w-[20%]" style={{ width: "20%" }}>Deskripsi</th>
                  <th className="border border-gray-300 p-1 text-left w-[15%]" style={{ width: "15%" }}>Lokasi</th>
                </tr>
              </thead>
              <tbody>
                {inspectionsWithAddress.map((inspection, index) => (
                  <tr key={inspection.id || index}>
                    <td className="border border-gray-300 p-1 align-top">
                      <div className="font-bold mb-0.5">{inspection.shipperName}</div>
                      <div className="text-xs text-gray-600 mb-0.5">
                        <span className="font-semibold">Komoditi:</span> {inspection.commodityType}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        <span className="font-semibold">No. Container:</span> {inspection.containerNumber || "-"}
                      </div>
                    </td>
                    <td className="border border-gray-300 p-1 align-top text-center">
                      {inspection.photos?.containerNumber ? (
                        <img
                          src={inspection.photos.containerNumber}
                          alt="Container No"
                          className="w-full h-32 object-contain border border-gray-200 block mx-auto"
                        />
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">Tidak Ada Foto</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1 align-top text-center">
                      {inspection.photos?.commodity ? (
                        <img
                          src={inspection.photos.commodity}
                          alt="Commodity"
                          className="w-full h-32 object-contain border border-gray-200 block mx-auto"
                        />
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">Tidak Ada Foto</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1 align-top text-center">
                      {inspection.photos?.shipper ? (
                        <img
                          src={inspection.photos.shipper}
                          alt="Packing"
                          className="w-full h-32 object-contain border border-gray-200 block mx-auto"
                        />
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">Tidak Ada Foto</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1 align-top text-center">
                      {inspection.photos?.ispm ? (
                        <img
                          src={inspection.photos.ispm}
                          alt="ISPM"
                          className="w-full h-32 object-contain border border-gray-200 block mx-auto"
                        />
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">Tidak Ada Foto</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-1 align-top">
                      <div className="space-y-1">
                        {inspection.notes && <p>{inspection.notes}</p>}
                        {inspection.stackingDescription && (
                          <p><span className="font-semibold">Stacking:</span> {inspection.stackingDescription}</p>
                        )}
                        {inspection.moistureDescription && (
                          <p><span className="font-semibold">Slicing:</span> {inspection.moistureDescription}</p>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 p-1 align-top">
                      {inspection.location && (
                        <div className="space-y-0.5">
                          <p className="text-[10px]">{inspection.location.latitude?.toFixed(6) || "-"}, {inspection.location.longitude?.toFixed(6) || "-"}</p>
                          {inspection.location.address && (
                            <div className="text-gray-600 mt-0.5">
                              <p className="font-semibold">
                                {inspection.location.address.street || inspection.location.address.name}
                              </p>
                              <p>{inspection.location.address.city}</p>
                            </div>
                          )}
                          <a href={inspection.location.mapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all block mt-0.5">
                            Tautan Peta
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-[10px] text-gray-500 border-t border-gray-300 pt-1 text-center">
              <p>Generated: {new Date().toLocaleString("id-ID")}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
