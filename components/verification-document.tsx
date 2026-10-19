"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Download,
  Printer,
  Loader2,
  Smartphone,
  FileText,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react"
import type { Inspection } from "@/types/inspection"
import { StaticMap } from "@/components/static-map"
import { cn } from "@/lib/utils"

export function VerificationDocument({ inspections }: { inspections: Inspection[] }) {
  const a4DocumentRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<"mobile" | "a4">("mobile")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [inspectionsWithAddress, setInspectionsWithAddress] = useState<Inspection[]>(inspections)

  // Auto-detect view mode on mount: mobile view by default on small screens
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1024) {
        setViewMode("a4")
      } else {
        setViewMode("mobile")
      }
    }
  }, [])

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
    setIsGenerating(true)
    const prevMode = viewMode

    try {
      // Temporarily switch to A4 view if not already, to ensure full official landscape capture
      if (prevMode !== "a4") {
        setViewMode("a4")
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      const element = a4DocumentRef.current
      if (!element) {
        throw new Error("Elemen dokumen A4 tidak ditemukan")
      }

      const html2pdfModule = await import("html2pdf.js")
      const html2pdf = html2pdfModule.default || html2pdfModule

      const dateStr = new Date().toISOString().split("T")[0]
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Dokumen-Verifikasi-Container-${dateStr}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
        jsPDF: { orientation: "landscape" as const, unit: "mm", format: "a4" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      }

      // @ts-ignore
      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Gagal membuat PDF. Silakan coba lagi.")
    } finally {
      if (prevMode !== "a4") {
        setViewMode(prevMode)
      }
      setIsGenerating(false)
    }
  }

  const handlePrint = async () => {
    const prevMode = viewMode
    let element = a4DocumentRef.current

    if (!element) {
      setViewMode("a4")
      await new Promise((resolve) => setTimeout(resolve, 200))
      element = a4DocumentRef.current
    }

    if (!element) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      if (prevMode !== "a4") setViewMode(prevMode)
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Dokumen Verifikasi Container</title>
          <style>
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
            @page { size: landscape; margin: 6mm; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 10px; color: #000; }
            .header-title { font-size: 1.25rem; font-weight: 800; text-align: center; text-transform: uppercase; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; border: 2px solid #000; }
            th { background-color: #9ca3af; color: #000000; border: 2px solid #000000; padding: 8px; font-weight: 800; text-align: center; font-size: 12px; }
            td { border: 2px solid #000000; padding: 8px; vertical-align: top; word-break: break-word; }
            img { width: 100%; height: 210px; object-fit: cover; display: block; border: 2px solid #000; }
            .photo-row { page-break-inside: avoid; }
            p { margin: 0 0 4px 0; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()

    if (prevMode !== "a4") {
      setViewMode(prevMode)
    }

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

  const getPhotoUrls = (val: any): string[] => {
    if (!val) return []
    if (Array.isArray(val)) {
      return val.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    }
    if (typeof val === "string" && val.trim().length > 0) {
      return [val]
    }
    return []
  }

  const getCategoryConfigs = (inspection: Inspection) => [
    {
      type: "containerNumber",
      label: "Foto Container",
      photos: getPhotoUrls(inspection.photos?.containerNumber),
      info: `Nomor kontainer beserta komoditas (pintu kiri dibuka agar terlihat komoditasnya)\n\nShipper: ${inspection.shipperName}\nNo. Container: ${inspection.containerNumber || "-"}\nKomoditi: ${inspection.commodityType}`,
    },
    {
      type: "commodity",
      label: "Foto Komoditi",
      photos: getPhotoUrls(inspection.photos?.commodity),
      info: `Foto komoditas (${inspection.commodityType}) dalam kontainer\n\nShipper: ${inspection.shipperName}\nNo. Container: ${inspection.containerNumber || "-"}`,
    },
    {
      type: "shipper",
      label: "Foto Packing Tag",
      photos: getPhotoUrls(inspection.photos?.shipper),
      info: `Foto packing tag & bukti pengirim (${inspection.shipperName})`,
    },
    {
      type: "ispm",
      label: "Foto Stempel ISPM",
      photos: getPhotoUrls(inspection.photos?.ispm),
      info: "Stempel ISPM 15 pada kemasan kayu / palet perlakuan",
    },
    {
      type: "stacking",
      label: "Foto Stacking",
      photos: getPhotoUrls(inspection.photos?.stacking),
      info: inspection.stackingDescription || "Kondisi penataan dan penyusunan barang (stacking) dalam kontainer",
    },
    {
      type: "slicing",
      label: "Foto Slicing / Monitoring",
      photos: getPhotoUrls(inspection.photos?.slicing),
      info: inspection.moistureDescription || "Peralatan monitoring memperlihatkan alat, kipas dan selang monitoring",
    },
    {
      type: "additionalPhotos",
      label: "Foto Tambahan",
      photos: getPhotoUrls(inspection.photos?.additionalPhotos),
      info: "Foto dokumentasi bukti tambahan pemeriksaan kontainer",
    },
  ]

  const getPhotoRows = (inspection: Inspection) => {
    const configs = getCategoryConfigs(inspection)
    return configs.flatMap((cat) => {
      if (cat.photos.length === 0) return []
      return cat.photos.map((src, idx) => ({
        type: cat.type,
        label: cat.photos.length > 1 ? `${cat.label} (Foto ${idx + 1}/${cat.photos.length})` : cat.label,
        src,
        info: cat.info,
      }))
    })
  }

  const isBusy = isEnriching || isGenerating

  return (
    <div className="space-y-3 sm:space-y-4 w-full">
      {/* Top Action Bar with View Toggle & Print/Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center bg-muted/40 p-2 sm:p-2.5 rounded-lg border border-border/60">
        <div className="flex items-center gap-1 bg-background p-1 rounded-md border shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setViewMode("mobile")}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded font-bold transition-all flex items-center justify-center gap-1.5 text-xs",
              viewMode === "mobile"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Tampilan Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("a4")}
            className={cn(
              "flex-1 sm:flex-initial px-3 py-1.5 rounded font-bold transition-all flex items-center justify-center gap-1.5 text-xs",
              viewMode === "a4"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Format Lembar A4</span>
          </button>
        </div>

        <div className="flex gap-2 items-center justify-end flex-wrap">
          {isEnriching && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Memuat data...
            </span>
          )}
          <Button onClick={handlePrint} variant="outline" size="sm" disabled={isBusy} className="h-8 text-xs font-semibold">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Cetak
          </Button>
          <Button onClick={handlePrintPDF} size="sm" disabled={isBusy} className="h-8 text-xs font-semibold bg-primary text-primary-foreground">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isGenerating ? "Membuat PDF..." : "Unduh PDF"}
          </Button>
        </div>
      </div>

      {viewMode === "a4" && (
        <div className="text-[11px] sm:text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-md p-2.5 flex items-center gap-2">
          <span className="text-base">💡</span>
          <span>
            <strong>Mode Dokumen A4:</strong> Format resmi lembar cetak lanskap. Pada layar ponsel, geser ke samping (swipe horizontal) untuk memeriksa seluruh kolom.
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MOBILE RESPONSIVE VIEW (Perfect Fit for all smartphones & tablets)     */}
      {/* ========================================================================= */}
      <div className={cn("w-full space-y-4", viewMode === "mobile" ? "block" : "hidden")}>
        <div className="bg-white text-black p-3 sm:p-4 rounded-lg border-2 border-black shadow-xs">
          <div className="text-center pb-2.5 border-b-2 border-black mb-4">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider m-0 text-black">
              Dokumen Verifikasi Container
            </h1>
            <p className="text-[11px] text-gray-600 font-medium mt-0.5">
              Pratinjau Hasil Pemeriksaan Lapangan
            </p>
          </div>

          {inspectionsWithAddress.map((inspection, insIdx) => {
            const lat = inspection.location?.latitude
            const lng = inspection.location?.longitude
            const photoRows = getPhotoRows(inspection)

            return (
              <div
                key={inspection.id || insIdx}
                className="mb-6 border-2 border-black rounded-lg overflow-hidden bg-white shadow-xs"
              >
                {/* DISTINCT CONTAINER HEADER BANNER */}
                <div className="bg-gray-900 text-white p-3 sm:p-3.5 border-b-2 border-black space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs sm:text-sm text-yellow-400 font-mono tracking-wide uppercase">
                        KONTAINER #{insIdx + 1}: {inspection.containerNumber || "TANPA NOMOR"}
                      </span>
                      {inspection.verificationStage === "akhir" ? (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-600 text-white border border-emerald-400 tracking-wider">
                          VERIFIKASI AKHIR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-blue-600 text-white border border-blue-400 tracking-wider">
                          VERIFIKASI AWAL
                        </span>
                      )}
                    </div>
                    <span className="self-start sm:self-auto text-[11px] bg-gray-800 text-gray-200 px-2 py-0.5 rounded border border-gray-700 font-medium">
                      Petugas: {inspection.createdBy}
                    </span>
                  </div>

                  <div className="text-xs text-gray-200 flex flex-wrap gap-x-2 gap-y-1 pt-1.5 border-t border-gray-800">
                    <span>Shipper: <strong className="text-white">{inspection.shipperName}</strong></span>
                    <span>•</span>
                    <span>Komoditi: <strong className="text-white capitalize">{inspection.commodityType}</strong></span>
                    {inspection.inspectionLocationName && (
                      <>
                        <span>•</span>
                        <span>Lokasi: <strong className="text-yellow-300">{inspection.inspectionLocationType === 'depo' ? 'Depo' : 'Pabrik'} - {inspection.inspectionLocationName}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                {/* CONTENT CARDS */}
                <div className="p-2.5 sm:p-3 space-y-4 bg-muted/10">
                  {photoRows.length === 0 ? (
                    <div className="bg-white p-4 rounded-md border border-gray-300 text-center space-y-3">
                      <p className="text-gray-400 italic text-xs">Tidak Ada Bukti Foto</p>
                      <div className="text-left bg-gray-50 p-2.5 rounded text-xs space-y-1 border border-gray-200">
                        <p className="font-bold">{inspection.shipperName}</p>
                        <p className="text-gray-600">No. Container: {inspection.containerNumber || "-"}</p>
                        <p className="text-gray-600">Komoditi: {inspection.commodityType}</p>
                      </div>
                    </div>
                  ) : (
                    photoRows.map((row, rIdx) => (
                      <div
                        key={`${insIdx}-${rIdx}`}
                        className="bg-white border-2 border-black rounded-lg overflow-hidden shadow-xs"
                      >
                        {/* Section Header */}
                        <div className="bg-gray-100 px-3 py-2 border-b-2 border-black flex items-center justify-between">
                          <span className="font-extrabold text-xs uppercase text-black flex items-center gap-1.5">
                            📷 {row.label}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black text-white">
                            {row.type}
                          </span>
                        </div>

                        <div className="p-3 space-y-3">
                          {/* 1. PHOTO */}
                          <div>
                            <div className="relative aspect-[4/3] w-full max-h-72 bg-black rounded-md overflow-hidden border-2 border-black">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={row.src}
                                alt={row.label}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() => window.open(row.src, "_blank")}
                                title="Klik untuk membuka foto ukuran penuh"
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center mt-1">
                              Ketuk foto untuk melihat resolusi penuh ↗
                            </p>
                          </div>

                          {/* 2. INFORMATION */}
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 space-y-2">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                              📋 Informasi & Spesifikasi
                            </span>
                            <p className="font-bold text-xs sm:text-sm text-black whitespace-pre-wrap leading-relaxed">
                              {row.info}
                            </p>

                            {inspection.notes && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <span className="font-bold text-[10px] uppercase text-amber-700 block">Catatan Khusus:</span>
                                <p className="text-xs text-gray-800 whitespace-pre-wrap mt-0.5">{inspection.notes}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                              <div className="bg-white p-2 rounded border border-gray-200">
                                <span className="font-bold text-[10px] uppercase text-gray-500 block mb-1">Tahap</span>
                                <span className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                                  inspection.verificationStage === "akhir"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-blue-100 text-blue-800 border border-blue-300"
                                }`}>
                                  {inspection.verificationStage === "akhir" ? "Verifikasi Akhir" : "Verifikasi Awal"}
                                </span>
                              </div>
                              <div className="bg-white p-2 rounded border border-gray-200">
                                <span className="font-bold text-[10px] uppercase text-gray-500 block mb-1">Status</span>
                                {inspection.status === "approved" ? (
                                  <span className="text-[11px] font-bold text-green-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui
                                  </span>
                                ) : inspection.status === "needs_correction" ? (
                                  <span className="text-[11px] font-bold text-red-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Perbaikan
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> Menunggu
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 3. LOCATION & MAP */}
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-red-600" /> Lokasi Pemeriksaan (GPS)
                              </span>
                              {lat && lng && (
                                <a
                                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  Buka Google Maps <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>

                            {lat && lng ? (
                              <div className="space-y-2">
                                <div className="w-full h-44 rounded-md overflow-hidden border-2 border-black">
                                  <StaticMap
                                    lat={lat}
                                    lng={lng}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="bg-white p-2.5 rounded border border-gray-300 text-xs space-y-0.5">
                                  <p className="font-bold text-black leading-snug">
                                    📍 {inspection.location?.address?.street || inspection.location?.address?.name || "Lokasi Inspeksi"}
                                  </p>
                                  <p className="text-gray-600 text-[11px]">
                                    {inspection.location?.address?.city || ""}, {inspection.location?.address?.province || ""}
                                  </p>
                                  <p className="font-mono text-blue-700 font-semibold text-[11px]">
                                    GPS: {lat?.toFixed(6)}, {lng?.toFixed(6)}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="py-6 text-center text-gray-400 italic text-xs bg-white rounded border">
                                Lokasi GPS Tidak Tersedia
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          <div className="text-[11px] text-gray-600 border-t-2 border-black pt-2.5 text-center font-medium">
            <p>Dokumen Resmi Hasil Verifikasi Kontainer · Generated: {new Date().toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. OFFICIAL A4 PRINT DOCUMENT (Horizontal Scroll on Mobile, Full on PC)   */}
      {/* ========================================================================= */}
      <div className={cn("w-full overflow-x-auto pb-4 pt-1", viewMode === "a4" ? "block" : "hidden")}>
        <div className="min-w-[840px]">
          <Card ref={a4DocumentRef} className="bg-white text-black p-4 w-full border-2 border-black">
            <div className="space-y-4">
              <div className="text-center pb-2 border-b-2 border-black">
                <h1 className="text-xl font-black uppercase tracking-wider m-0 text-black">
                  Dokumen Verifikasi Container
                </h1>
              </div>

              {inspectionsWithAddress.map((inspection, insIdx) => {
                const lat = inspection.location?.latitude
                const lng = inspection.location?.longitude
                const photoRows = getPhotoRows(inspection)

                return (
                  <div
                    key={inspection.id || insIdx}
                    className="mb-8 border-4 border-black rounded-sm overflow-hidden page-break-after-always shadow-md"
                  >
                    {/* DISTINCT CONTAINER HEADER BANNER */}
                    <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between border-b-4 border-black">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-yellow-400 font-mono tracking-wide uppercase">
                            KONTAINER #{insIdx + 1}: {inspection.containerNumber || "TANPA NOMOR"}
                          </span>
                          {inspection.verificationStage === "akhir" ? (
                            <span className="px-2 py-0.5 text-[11px] font-black uppercase rounded bg-emerald-600 text-white border border-emerald-400 tracking-wider">
                              VERIFIKASI AKHIR
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] font-black uppercase rounded bg-blue-600 text-white border border-blue-400 tracking-wider">
                              VERIFIKASI AWAL
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-200 mt-1 block">
                          • Shipper: <strong className="text-white">{inspection.shipperName}</strong> • Komoditi: <strong className="text-white capitalize">{inspection.commodityType}</strong>
                          {inspection.inspectionLocationName && (
                            <> • Lokasi: <strong className="text-yellow-300">{inspection.inspectionLocationType === 'depo' ? 'Depo' : 'Pabrik'} - {inspection.inspectionLocationName}</strong></>
                          )}
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
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-bold text-sm text-black">{inspection.shipperName}</p>
                                <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                                  inspection.verificationStage === "akhir"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-blue-100 text-blue-800 border border-blue-300"
                                }`}>
                                  {inspection.verificationStage === "akhir" ? "Verifikasi Akhir" : "Verifikasi Awal"}
                                </span>
                              </div>
                              <p className="text-xs text-gray-700">Tahap: {inspection.verificationStage === "akhir" ? "Verifikasi Akhir" : "Verifikasi Awal"}</p>
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
                            <tr key={`${insIdx}-${rIdx}`} className="border-b-2 border-black page-break-inside-avoid photo-row">
                              {/* PHOTOS COLUMN (LEFT) */}
                              <td className="border-2 border-black p-2 align-top text-center bg-gray-50/50">
                                <div className="w-full">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={row.src}
                                    alt={row.label}
                                    className="w-full h-52 sm:h-64 object-cover border-2 border-black block rounded-xs bg-black cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => window.open(row.src, "_blank")}
                                    title="Klik untuk membuka foto ukuran/resolusi penuh"
                                  />
                                  <span className="block text-[10px] font-bold text-black uppercase mt-1">
                                    {row.label}
                                  </span>
                                </div>
                              </td>

                              {/* INFORMATION COLUMN (MIDDLE) */}
                              <td className="border-2 border-black p-3 align-top" style={{ wordBreak: "break-word" }}>
                                <p className="font-bold text-xs sm:text-sm text-black leading-snug whitespace-pre-wrap">
                                  {row.info}
                                </p>
                                {inspection.notes && (
                                  <div className="mt-3 pt-2 border-t border-gray-300 text-xs text-gray-800">
                                    <span className="font-bold block text-[10px] uppercase text-gray-600">Catatan Khusus:</span>
                                    <p className="whitespace-pre-wrap">{inspection.notes}</p>
                                  </div>
                                )}
                                <div className="mt-3 pt-2 border-t border-gray-300 text-[11px] space-y-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <span className="font-bold text-[10px] uppercase text-gray-600">Tahap Verifikasi:</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                                      inspection.verificationStage === "akhir"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : "bg-blue-100 text-blue-800 border border-blue-300"
                                    }`}>
                                      {inspection.verificationStage === "akhir" ? "Verifikasi Akhir" : "Verifikasi Awal"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold block text-[10px] uppercase text-gray-600">Hasil Verifikasi:</span>
                                    {inspection.status === "approved" ? (
                                      <span className="font-bold text-green-700">✓ Disetujui (Terverifikasi)</span>
                                    ) : inspection.status === "needs_correction" ? (
                                      <span className="font-bold text-red-700">⚠️ Minta Perbaikan</span>
                                    ) : (
                                      <span className="font-bold text-yellow-700">🕒 Menunggu Tinjauan</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* LOCATION COLUMN (RIGHT WITH MAP IMAGE) */}
                              <td className="border-2 border-black p-2 align-top text-center bg-gray-50/50" style={{ wordBreak: "break-word" }}>
                                {lat && lng ? (
                                  <div className="map-container space-y-2">
                                    <StaticMap
                                      lat={lat}
                                      lng={lng}
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
    </div>
  )
}
