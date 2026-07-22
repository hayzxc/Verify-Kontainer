"use client"

import { useState, useEffect, useCallback } from "react"
import type { User } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { LogOut, Clock, CheckCircle, AlertCircle, Plus, FileText, Loader2, X } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import { InspectionFilters, type FilterState } from "@/components/inspection-filters"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { InspectionForm } from "@/components/inspection-form"
import { VerificationDocument } from "@/components/verification-document"
import type { Inspection, InspectionData } from "@/types/inspection"

const MAX_SELECTION = 4

export function VerificatorDashboard({ user }: { user: User }) {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [documentInspections, setDocumentInspections] = useState<Inspection[]>([])
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)
  const [activeTab, setActiveTab] = useState("form")
  const [initialFormData, setInitialFormData] = useState<InspectionData | undefined>(undefined)
  const [lastSavedInspection, setLastSavedInspection] = useState<Inspection | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    commodityType: "",
    createdBy: "",
    dateFrom: "",
    dateTo: "",
  })

  // Multi-select state for document generation
  const [docSelection, setDocSelection] = useState<Set<number>>(new Set())
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
  const [editingInspectionId, setEditingInspectionId] = useState<number | null>(null)
  const canCreateDocument = user.role !== "user"

  const { logout } = useAuth()
  const router = useRouter()

  const loadInspections = useCallback(async (currentFilters?: FilterState) => {
    try {
      const f = currentFilters || filters
      const params = new URLSearchParams({ limit: "100", createdBy: user.name })
      if (f.search) params.set("search", f.search)
      if (f.status && f.status !== "all") params.set("status", f.status)
      if (f.commodityType && f.commodityType !== "all") params.set("commodityType", f.commodityType)
      if (f.dateFrom) params.set("dateFrom", f.dateFrom)
      if (f.dateTo) params.set("dateTo", f.dateTo)

      const res = await fetch(`/api/inspections?${params.toString()}`, {
        credentials: "include",
      })
      if (res.status === 401) {
        logout()
        router.push("/login")
        return
      }
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setInspections(data.data || [])
    } catch (error) {
      console.error("Failed to load inspections:", error)
    }
  }, [user.name, logout, router, filters])

  useEffect(() => {
    loadInspections()
    const interval = setInterval(() => loadInspections(), 30000)
    const handleFocus = () => loadInspections()
    window.addEventListener("focus", handleFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [loadInspections])

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    loadInspections(newFilters)
  }, [loadInspections])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleSaveInspection = async (newInspection: InspectionData) => {
    try {
      if (editingInspectionId) {
        // Resubmit updated inspection for admin re-verification
        const res = await fetch(`/api/inspections/${editingInspectionId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newInspection),
        })

        if (!res.ok) throw new Error("Failed to resubmit inspection")

        const updatedInspection: Inspection = await res.json()
        setInspections((prev) => prev.map(i => i.id === updatedInspection.id ? updatedInspection : i))
        setEditingInspectionId(null)
        setInitialFormData(undefined)
        alert("Inspeksi perbaikan berhasil dikirim ulang ke Admin untuk verifikasi!")
      } else {
        // Create new inspection
        const res = await fetch("/api/inspections", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newInspection,
            createdBy: user.name,
          }),
        })

        if (!res.ok) throw new Error("Failed to save")

        const savedInspection: Inspection = await res.json()
        setInspections((prev) => [savedInspection, ...prev])
        setLastSavedInspection(savedInspection)
        alert("Inspeksi berhasil dikirim ke Admin untuk verifikasi!")
      }
    } catch (error) {
      console.error("Error saving inspection:", error)
      alert("Gagal menyimpan data. Silakan coba lagi.")
    }
  }

  const handleSelectInspection = async (data: Partial<Inspection> & InspectionData) => {
    if (data.id) {
      try {
        const res = await fetch(`/api/inspections/${data.id}`, { credentials: "include" })
        if (res.ok) {
          const fullData = await res.json()
          setDocumentInspections([fullData])
          setShowDocumentPreview(true)
          return
        }
      } catch (error) {
        console.error("Failed to fetch full inspection details:", error)
      }
    }

    const tempInspection: Inspection = {
      ...data,
      id: 0,
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      status: "pending",
    }
    setDocumentInspections([tempInspection])
    setShowDocumentPreview(true)
  }

  /** Open single inspection document */
  const handleViewSingle = async (inspection: Inspection) => {
    setIsLoadingDoc(true)
    try {
      const res = await fetch(`/api/inspections/${inspection.id}`, { credentials: "include" })
      if (res.ok) {
        const fullData = await res.json()
        setDocumentInspections([fullData])
      } else {
        setDocumentInspections([inspection])
      }
    } catch {
      setDocumentInspections([inspection])
    } finally {
      setIsLoadingDoc(false)
    }
    setShowDocumentPreview(true)
  }

  /** Open multi-inspection document from checkbox selection */
  const handleBuildDocument = async () => {
    if (docSelection.size === 0) return
    setIsLoadingDoc(true)
    try {
      const fetches = Array.from(docSelection).map(async (id) => {
        const res = await fetch(`/api/inspections/${id}`, { credentials: "include" })
        if (res.ok) return res.json() as Promise<Inspection>
        // Fall back to list data if fetch fails
        return inspections.find((i) => i.id === id) ?? null
      })
      const results = (await Promise.all(fetches)).filter(Boolean) as Inspection[]
      setDocumentInspections(results)
    } catch {
      alert("Gagal memuat data inspeksi.")
      return
    } finally {
      setIsLoadingDoc(false)
    }
    setShowDocumentPreview(true)
  }

  const toggleSelection = (id: number) => {
    setDocSelection((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= MAX_SELECTION) return prev // cap at 4
        next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => setDocSelection(new Set())

  const handleEditResubmit = (inspection: Inspection) => {
    setEditingInspectionId(inspection.id)
    setInitialFormData({
      shipperName: inspection.shipperName,
      commodityType: inspection.commodityType,
      containerNumber: inspection.containerNumber || "",
      notes: inspection.notes || "",
      location: inspection.location,
      photos: inspection.photos || {
        shipper: null,
        containerNumber: null,
        commodity: null,
        ispm: null,
        stacking: null,
        slicing: null,
      },
      stackingDescription: inspection.stackingDescription || "",
      slicingDescription: inspection.moistureDescription || "",
    })
    setActiveTab("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDuplicate = async (inspection: Inspection) => {
    let sourceData = inspection

    setEditingInspectionId(null)
    setInitialFormData({
      shipperName: sourceData.shipperName,
      commodityType: sourceData.commodityType,
      containerNumber: "",
      notes: sourceData.notes || "",
      location: sourceData.location,
      photos: {
        shipper: null,
        containerNumber: null,
        commodity: null,
        ispm: null,
        stacking: null,
        slicing: null,
      },
      stackingDescription: sourceData.stackingDescription || "",
      slicingDescription: sourceData.moistureDescription || "",
    })
    setActiveTab("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const pendingCount = inspections.filter((i) => i.status === "pending").length
  const approvedCount = inspections.filter((i) => i.status === "approved").length
  const correctionCount = inspections.filter((i) => i.status === "needs_correction").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "needs_correction":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Correction
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const selectionCount = docSelection.size

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-10 border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:block">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                {user.role === "user" ? "Dasbor Inspeksi" : "Dasbor Verifikator"}
              </h1>
              <p className="text-xs sm:text-sm opacity-90">Sistem Inspeksi Kontainer</p>
            </div>
            <div className="flex items-center gap-1 sm:hidden">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-primary-foreground/20">
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell />
            </div>
            <div className="flex items-center gap-2">
              {user.avatar && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={user.avatar} alt={user.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/40" />
              )}
              <div className="text-xs sm:text-sm text-left sm:text-right">
                <p className="font-semibold leading-none">{user.name}</p>
                <p className="text-[10px] sm:text-xs opacity-75 mt-0.5">
                  {user.role === "admin" ? "Admin" : user.role === "verificator" ? "Petugas Verifikasi" : "Pengguna"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-white text-primary hover:bg-gray-100 border-white text-xs sm:text-sm px-2.5 sm:px-3 h-8 sm:h-9"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-2 sm:p-4">
            <CardHeader className="p-0 pb-1 sm:pb-2">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 truncate">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />
                <span className="truncate">Menunggu</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg sm:text-3xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">Tinjauan admin</p>
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-4">
            <CardHeader className="p-0 pb-1 sm:pb-2">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 truncate">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <span className="truncate">Disetujui</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg sm:text-3xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">Terverifikasi</p>
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-4">
            <CardHeader className="p-0 pb-1 sm:pb-2">
              <CardTitle className="text-[11px] sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2 truncate">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
                <span className="truncate">Perlu Perbaikan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-lg sm:text-3xl font-bold text-red-600">{correctionCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">Perlu tindakan</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Inspeksi Baru</TabsTrigger>
            <TabsTrigger value="history">Inspeksiku</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-8">
            {editingInspectionId && (
              <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                      Modus Edit & Kirim Ulang Inspeksi #{editingInspectionId}
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Perbaiki data atau foto sesuai masukan Admin, lalu tekan simpan untuk mengirim ulang ke Admin untuk re-verifikasi.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                  onClick={() => {
                    setEditingInspectionId(null)
                    setInitialFormData(undefined)
                  }}
                >
                  Batal Edit
                </Button>
              </div>
            )}
            <InspectionForm
              onSave={handleSaveInspection}
              onSelect={handleSelectInspection}
              initialData={initialFormData}
            />

            {lastSavedInspection && (
              <Card className="mt-6 border-dashed border-2 bg-muted/30">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Baru saja menyimpan inspeksi untuk <strong>{lastSavedInspection.shipperName}</strong>.
                    <br />
                    Ingin menambahkan kontainer lain untuk shipper ini?
                  </p>
                  <Button
                    onClick={() => handleDuplicate(lastSavedInspection)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Kontainer Lain (Shipper Sama)
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-8">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Inspeksiku</CardTitle>
                    <CardDescription>Inspeksi yang Anda kirim dan status tinjauannya</CardDescription>
                  </div>
                  {/* Selection hint */}
                  {canCreateDocument && (
                    <p className="text-xs text-muted-foreground self-end">
                      Centang hingga {MAX_SELECTION} inspeksi lalu tekan <strong>Buat Dokumen</strong>
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <InspectionFilters
                  onFilterChange={handleFilterChange}
                  showCreatedByFilter={false}
                />
                {inspections.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada inspeksi</p>
                ) : (
                  <div className="space-y-3">
                    {inspections.map((inspection) => {
                      const isSelected = docSelection.has(inspection.id)
                      const isAtLimit = selectionCount >= MAX_SELECTION && !isSelected

                      return (
                        <Card
                          key={inspection.id}
                          className={`transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : inspection.status === "needs_correction"
                              ? "border-red-300 dark:border-red-800 bg-red-50/20"
                              : ""
                          }`}
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                {/* Checkbox */}
                                {canCreateDocument && (
                                  <div className="mt-1 flex-shrink-0">
                                    <Checkbox
                                      id={`sel-${inspection.id}`}
                                      checked={isSelected}
                                      disabled={isAtLimit}
                                      onCheckedChange={() => toggleSelection(inspection.id)}
                                      title={isAtLimit ? `Maksimal ${MAX_SELECTION} inspeksi` : ""}
                                      className="border-2 border-blue-400 data-[state=checked]:border-blue-600"
                                    />
                                  </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="font-semibold text-base sm:text-lg">{inspection.shipperName}</h3>
                                    {getStatusBadge(inspection.status)}
                                  </div>
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    {inspection.commodityType} · No. {inspection.containerNumber || "-"} ·{" "}
                                    {new Date(inspection.createdAt).toLocaleString("id-ID")}
                                  </p>
                                  {inspection.adminNotes && (
                                    <div
                                      className={`mt-2 p-2.5 rounded-md text-xs sm:text-sm ${
                                        inspection.status === "needs_correction"
                                          ? "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
                                          : "bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-200"
                                      }`}
                                    >
                                      <span className="font-semibold">
                                        {inspection.status === "needs_correction" ? "⚠️ Masukan Admin: " : "Catatan Admin: "}
                                      </span>
                                      {inspection.adminNotes}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border justify-end w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                {inspection.status === "needs_correction" && (
                                  <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-xs sm:text-sm"
                                    onClick={() => handleEditResubmit(inspection)}
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Edit & Kirim Ulang
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isLoadingDoc}
                                  onClick={() => handleViewSingle(inspection)}
                                  className="text-xs sm:text-sm"
                                >
                                  Lihat
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-8 h-8"
                                  title="Tambah kontainer untuk shipper ini"
                                  onClick={() => handleDuplicate(inspection)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating selection action bar */}
        {canCreateDocument && selectionCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 bg-primary text-primary-foreground rounded-full px-5 py-3 shadow-2xl">
              <span className="text-sm font-medium">
                {selectionCount} / {MAX_SELECTION} dipilih
              </span>
              <div className="w-px h-4 bg-primary-foreground/30" />
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full h-8 gap-1.5"
                disabled={isLoadingDoc}
                onClick={handleBuildDocument}
              >
                {isLoadingDoc ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Buat Dokumen
              </Button>
              <button
                onClick={clearSelection}
                className="ml-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                title="Batal pilih semua"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <Dialog open={showDocumentPreview} onOpenChange={setShowDocumentPreview}>
          <DialogContent className="sm:max-w-[908px] max-w-[908px] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pratinjau Dokumen</DialogTitle>
              <DialogDescription>
                {documentInspections.length > 1
                  ? `Dokumen verifikasi untuk ${documentInspections.length} kontainer`
                  : "Tinjau dan cetak dokumen verifikasi."}
              </DialogDescription>
            </DialogHeader>
            {documentInspections.length > 0 && (
              <VerificationDocument inspections={documentInspections} />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
