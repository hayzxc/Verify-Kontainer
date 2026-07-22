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
      const dateStr = new Date().toISOString().split("T")[0]
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Dokumen-Verifikasi-Container-${dateStr}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: "landscape" as const, unit: "mm", format: "a4" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
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
          <title>Print Dokumen Verifikasi Container</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 10px; color: #000; }
            .header-title { font-size: 1.25rem; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; border: 2px solid #000; }
            th { background-color: #9ca3af; color: #000000; border: 2px solid #000000; padding: 8px; font-weight: 800; text-align: center; font-size: 12px; }
            td { border: 2px solid #000000; padding: 8px; vertical-align: top; }
            img { width: 100%; height: 210px; object-fit: cover; display: block; border: 1px solid #000; }
            .photo-row { page-break-inside: avoid; }
            p { margin: 0 0 4px 0; }
          </style>
        </head>
        <body>
          ${documentRef.current.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()

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
        img.addEventListener("error", tryPrint)
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
            Memuat foto & lokasi...
          </span>
        )}
        <Button onClick={handlePrint} variant="outline" disabled={isBusy}>
          <Printer className="w-4 h-4 mr-2" />
          Cetak
        </Button>
        <Button onClick={handlePrintPDF} disabled={isBusy} className="bg-primary text-primary-foreground">
          <Download className="w-4 h-4 mr-2" />
          {isGenerating ? "Membuat PDF..." : "Unduh PDF"}
        </Button>
      </div>

      <div className="overflow-auto">
        <Card ref={documentRef} className="bg-white text-black p-4 w-full border-2 border-black">
          <div className="space-y-4">
            <div className="text-center pb-2 border-b-2 border-black">
              <h1 className="text-xl font-black uppercase tracking-wider m-0 text-black">
                Dokumen Verifikasi Container
              </h1>
            </div>

            {inspectionsWithAddress.map((inspection, insIdx) => {
              const lat = inspection.location?.latitude
              const lng = inspection.location?.longitude
              const mapUrl = lat && lng
                ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=400x300&markers=${lat},${lng},red-pushpin`
                : null

              const photoRows = [
                {
                  type: "containerNumber",
                  label: "Foto Container",
                  src: inspection.photos?.containerNumber,
                  info: `Nomor kontainer beserta komoditas (pintu kiri dibuka agar terlihat komoditasnya)\n\nShipper: ${inspection.shipperName}\nNo. Container: ${inspection.containerNumber || "-"}\nKomoditi: ${inspection.commodityType}`,
                },
                {
                  type: "commodity",
                  label: "Foto Komoditi",
                  src: inspection.photos?.commodity,
                  info: `Foto komoditas (${inspection.commodityType}) dalam kontainer\n\nShipper: ${inspection.shipperName}\nNo. Container: ${inspection.containerNumber || "-"}`,
                },
                {
                  type: "shipper",
                  label: "Foto Packing Tag",
                  src: inspection.photos?.shipper,
                  info: `Foto packing tag & bukti pengirim (${inspection.shipperName})`,
                },
                {
                  type: "ispm",
                  label: "Foto Stempel ISPM",
                  src: inspection.photos?.ispm,
                  info: "Stempel ISPM 15 pada kemasan kayu / palet perlakuan",
                },
                {
                  type: "stacking",
                  label: "Foto Stacking",
                  src: inspection.photos?.stacking,
                  info: inspection.stackingDescription || "Kondisi penataan dan penyusunan barang (stacking) dalam kontainer",
                },
                {
                  type: "slicing",
                  label: "Foto Slicing / Monitoring",
                  src: inspection.photos?.slicing,
                  info: inspection.moistureDescription || "Peralatan monitoring memperlihatkan alat, kipas dan selang monitoring",
                },
              ].filter((item) => Boolean(item.src))

              return (
                <div
                  key={inspection.id || insIdx}
                  className="mb-8 border-4 border-black rounded-sm overflow-hidden page-break-after-always shadow-md"
                >
                  {/* DISTINCT CONTAINER HEADER BANNER */}
                  <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between border-b-4 border-black">
                    <div>
                      <span className="font-extrabold text-sm text-yellow-400 font-mono tracking-wide uppercase">
                        KONTAINER #{insIdx + 1}: {inspection.containerNumber || "TANPA NOMOR"}
                      </span>
                      <span className="ml-3 text-xs text-gray-200">
                        • Shipper: <strong className="text-white">{inspection.shipperName}</strong> • Komoditi: <strong className="text-white capitalize">{inspection.commodityType}</strong>
                      </span>
                    </div>
                    <span className="text-xs bg-gray-800 text-gray-200 px-2.5 py-1 rounded border border-gray-700 font-medium">
                      Petugas: {inspection.createdBy}
                    </span>
                  </div>

                  <table className="w-full text-xs border-collapse table-fixed">
                    <thead>
                      <tr className="bg-gray-300 text-black border-b-2 border-black">
                        <th className="border-2 border-black p-2 text-center font-extrabold text-xs sm:text-sm w-[36%]" style={{ width: "36%" }}>
                          Photos
                        </th>
                        <th className="border-2 border-black p-2 text-center font-extrabold text-xs sm:text-sm w-[34%]" style={{ width: "34%" }}>
                          Information
                        </th>
                        <th className="border-2 border-black p-2 text-center font-extrabold text-xs sm:text-sm w-[30%]" style={{ width: "30%" }}>
                          Location
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {photoRows.length === 0 ? (
                        <tr className="border-b-2 border-black">
                          <td className="border-2 border-black p-4 text-center align-middle text-gray-400 italic">
                            Tidak Ada Bukti Foto
                          </td>
                          <td className="border-2 border-black p-3 align-top">
                            <p className="font-bold text-sm text-black">{inspection.shipperName}</p>
                            <p className="text-xs text-gray-700">No. Container: {inspection.containerNumber || "-"}</p>
                            <p className="text-xs text-gray-700">Komoditi: {inspection.commodityType}</p>
                          </td>
                          <td className="border-2 border-black p-3 align-top text-center">
                            {lat && lng ? (
                              <div>
                                <p className="font-bold text-xs">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
                                <p className="text-xs text-gray-700">{inspection.location?.address?.city || ""}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Lokasi Tidak Tersedia</span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        photoRows.map((row, rIdx) => (
                          <tr key={`${insIdx}-${rIdx}`} className="border-b-2 border-black page-break-inside-avoid">
                            {/* PHOTOS COLUMN (LEFT) */}
                            <td className="border-2 border-black p-2 align-top text-center bg-gray-50/50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={row.src!}
                                alt={row.label}
                                className="w-full h-52 sm:h-64 object-cover border-2 border-black block rounded-xs bg-black"
                              />
                              <span className="block text-[10px] font-bold text-black uppercase mt-1">
                                {row.label}
                              </span>
                            </td>

                            {/* INFORMATION COLUMN (MIDDLE) */}
                            <td className="border-2 border-black p-3 align-top">
                              <p className="font-bold text-xs sm:text-sm text-black leading-snug whitespace-pre-wrap">
                                {row.info}
                              </p>
                              {inspection.notes && (
                                <div className="mt-3 pt-2 border-t border-gray-300 text-xs text-gray-800">
                                  <span className="font-bold block text-[10px] uppercase text-gray-600">Catatan Khusus:</span>
                                  <p className="whitespace-pre-wrap">{inspection.notes}</p>
                                </div>
                              )}
                              <div className="mt-3 pt-2 border-t border-gray-300 text-[11px]">
                                <span className="font-bold block text-[10px] uppercase text-gray-600">Hasil Verifikasi:</span>
                                {inspection.status === "approved" ? (
                                  <span className="font-bold text-green-700">✓ Disetujui (Terverifikasi)</span>
                                ) : inspection.status === "needs_correction" ? (
                                  <span className="font-bold text-red-700">⚠️ Minta Perbaikan</span>
                                ) : (
                                  <span className="font-bold text-yellow-700">🕒 Menunggu Tinjauan</span>
                                )}
                              </div>
                            </td>

                            {/* LOCATION COLUMN (RIGHT WITH MAP IMAGE) */}
                            <td className="border-2 border-black p-2 align-top text-center bg-gray-50/50">
                              {mapUrl ? (
                                <div className="space-y-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={mapUrl}
                                    alt="Location Map"
                                    className="w-full h-44 sm:h-52 object-cover border-2 border-black block rounded-xs bg-gray-200"
                                  />
                                  <div className="text-left text-[10px] font-sans bg-white p-2 border border-black rounded-xs space-y-0.5">
                                    <p className="font-bold text-black leading-tight">
                                      📍 {inspection.location?.address?.street || inspection.location?.address?.name || "Lokasi Inspeksi"}
                                    </p>
                                    <p className="text-gray-700">
                                      {inspection.location?.address?.city || ""}, {inspection.location?.address?.province || ""}
                                    </p>
                                    <p className="font-mono text-blue-700 font-semibold">
                                      {lat?.toFixed(6)}, {lng?.toFixed(6)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-12 text-center text-gray-400 italic text-xs">
                                  Lokasi Tidak Tersedia
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })}

            <div className="text-xs text-gray-600 border-t-2 border-black pt-2 text-center font-medium">
              <p>Dokumen Resmi Hasil Verifikasi Kontainer · Generated: {new Date().toLocaleString("id-ID")}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
