"use client"

import { useState, useEffect, useCallback } from "react"
import type { User } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { LogOut, Users, FileText, Container, Clock, CheckCircle, AlertCircle, Eye, Trash2 } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import { InspectionFilters, type FilterState } from "@/components/inspection-filters"

// ... inside AdminDashboard ...


import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { InspectionForm } from "@/components/inspection-form"
import dynamic from "next/dynamic"

const VerificationDocument = dynamic(
  () => import("@/components/verification-document").then((mod) => mod.VerificationDocument),
  { loading: () => <p>Loading document...</p> }
)
import { UserManagement } from "@/components/user-management"
import type { Inspection, InspectionData } from "@/types/inspection"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserData {
  id: string
  name: string
  email: string
  role: "admin" | "verificator"
}

export function AdminDashboard({ user }: { user: User }) {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)
  const [documentSelection, setDocumentSelection] = useState<Inspection[]>([])
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingInspection, setReviewingInspection] = useState<Inspection | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    commodityType: "",
    createdBy: "",
    dateFrom: "",
    dateTo: "",
  })
  const { logout } = useAuth()
  const router = useRouter()

  const loadData = useCallback(async (currentFilters?: FilterState) => {
    // Load inspections with filters
    try {
      const f = currentFilters || filters
      const params = new URLSearchParams({ limit: "100" })
      if (f.search) params.set("search", f.search)
      if (f.status && f.status !== "all") params.set("status", f.status)
      if (f.commodityType && f.commodityType !== "all") params.set("commodityType", f.commodityType)
      if (f.createdBy && f.createdBy !== "all") params.set("createdBy", f.createdBy)
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
      if (!res.ok) throw new Error("Failed to fetch inspections")
      const data = await res.json()
      setInspections(data.data || [])
    } catch (error) {
      console.error("Failed to load inspections:", error)
    }

    // Load users (still from localStorage for now as per plan, or mock)
    const savedUsers = localStorage.getItem("users")
    if (savedUsers) {
      try {
        const allUsers = JSON.parse(savedUsers)
        if (Array.isArray(allUsers)) {
          setUsers(allUsers.map(({ password, ...rest }: UserData & { password?: string }) => rest))
        } else {
          setUsers([])
        }
      } catch (e) {
        console.error("Failed to load users:", e)
        setUsers([])
      }
    }
  }, [logout, router, filters])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => loadData(), 30000)
    const handleFocus = () => loadData()
    window.addEventListener("focus", handleFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [loadData])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    loadData(newFilters)
  }, [loadData])

  // Get unique verificator names for filter
  const verificatorOptions = [...new Set(inspections.map(i => i.createdBy))].filter(Boolean)

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus inspeksi ini? Data yang dihapus tidak dapat dikembalikan.")) return

    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) throw new Error("Failed to delete")

      setInspections((prev) => prev.filter((i) => i.id !== id))
      // Also remove from selection if present
      setDocumentSelection((prev) => prev.filter((i) => i.id !== id))
    } catch (error) {
      console.error("Error deleting inspection:", error)
      alert("Gagal menghapus data.")
    }
  }

  const handleSaveInspection = async (newInspection: InspectionData) => {
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newInspection,
          createdBy: user.name,
          status: "approved", // Admin created is auto-approved
        }),
      })

      if (!res.ok) throw new Error("Failed to save")

      const savedInspection = await res.json()
      setInspections((prev) => [savedInspection, ...prev])
      alert("Inspection saved successfully!")
    } catch (error) {
      console.error("Error saving inspection:", error)
      alert("Gagal menyimpan data. Silakan coba lagi.")
    }
  }

  // Handle selection from InspectionForm (InspectionData)
  const handleSelectInspection = (data: InspectionData) => {
    // Create a temporary Inspection object for preview
    const tempInspection: Inspection = {
      ...data,
      id: 0, // Placeholder
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      status: "approved"
    }
    setSelectedInspection(tempInspection)
  }

  const toggleDocumentSelection = (inspection: Inspection) => {
    setDocumentSelection((prev) => {
      const exists = prev.find((i) => i.id === inspection.id)
      if (exists) {
        return prev.filter((i) => i.id !== inspection.id)
      } else {
        if (prev.length >= 10) {
          alert("Maximum 10 documents can be selected at once.")
          return prev
        }
        return [...prev, inspection]
      }
    })
  }

  const clearDocumentSelection = () => {
    setDocumentSelection([])
  }

  const handleOpenReview = (inspection: Inspection) => {
    setReviewingInspection(inspection)
    setAdminNotes(inspection.adminNotes || "")
    setReviewDialogOpen(true)
  }

  const handleApprove = async () => {
    if (!reviewingInspection) return

    try {
      const res = await fetch(`/api/inspections/${reviewingInspection.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          adminNotes: adminNotes || null,
        }),
      })

      if (!res.ok) throw new Error("Failed to approve")

      const updatedInspection = await res.json()
      setInspections((prev) =>
        prev.map((i) => (i.id === updatedInspection.id ? updatedInspection : i))
      )

      setReviewDialogOpen(false)
      setReviewingInspection(null)
      setAdminNotes("")
    } catch (error) {
      console.error("Error approving inspection:", error)
      alert("Gagal memproses data.")
    }
  }

  const handleRequestCorrection = async () => {
    if (!reviewingInspection || !adminNotes.trim()) return

    try {
      const res = await fetch(`/api/inspections/${reviewingInspection.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "needs_correction",
          adminNotes: adminNotes,
        }),
      })

      if (!res.ok) throw new Error("Failed to request correction")

      const updatedInspection = await res.json()
      setInspections((prev) =>
        prev.map((i) => (i.id === updatedInspection.id ? updatedInspection : i))
      )

      setReviewDialogOpen(false)
      setReviewingInspection(null)
      setAdminNotes("")
    } catch (error) {
      console.error("Error requesting correction:", error)
      alert("Gagal memproses data.")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
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

  const totalInspections = inspections.length
  const verificators = users.filter((u) => u.role === "verificator").length
  const pendingCount = inspections.filter((i) => i.status === "pending").length
  const approvedCount = inspections.filter((i) => i.status === "approved").length
  const correctionCount = inspections.filter((i) => i.status === "needs_correction").length

  const pendingInspections = inspections.filter((i) => i.status === "pending")

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-10 border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:block">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold leading-tight">Dasbor Admin</h1>
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
            <div className="text-xs sm:text-sm text-left sm:text-right">
              <p className="font-semibold leading-none">{user.name}</p>
              <p className="text-[10px] sm:text-xs opacity-75 mt-0.5">Administrator</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-4">
            <CardHeader className="p-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                <Container className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Total Inspeksi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl sm:text-3xl font-bold">{totalInspections}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">inspeksi</p>
            </CardContent>
          </Card>

          <Card className={`p-3 sm:p-4 ${pendingCount > 0 ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}`}>
            <CardHeader className="p-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />
                <span className="truncate">Menunggu</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl sm:text-3xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">perlu ditinjau</p>
            </CardContent>
          </Card>

          <Card className="p-3 sm:p-4">
            <CardHeader className="p-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <span className="truncate">Disetujui</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl sm:text-3xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">terverifikasi</p>
            </CardContent>
          </Card>

          <Card className="p-3 sm:p-4">
            <CardHeader className="p-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1.5 truncate">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Petugas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-xl sm:text-3xl font-bold">{verificators}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">verifikator</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="review" className="w-full">
          <div className="overflow-x-auto w-full no-scrollbar pb-1">
            <TabsList className="grid w-full min-w-[420px] grid-cols-4 text-xs sm:text-sm">
              <TabsTrigger value="review" className="relative text-xs sm:text-sm px-2">
                <Clock className="h-3.5 w-3.5 mr-1 sm:mr-2" />
                Tinjau
                {pendingCount > 0 && (
                  <span className="ml-1 bg-yellow-500 text-white text-[10px] sm:text-xs rounded-full px-1.5 py-0.2">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="form" className="text-xs sm:text-sm px-2">Inspeksi Baru</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm px-2">
                <FileText className="h-3.5 w-3.5 mr-1 sm:mr-2" />
                Semua Data
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2">
                <Users className="h-3.5 w-3.5 mr-1 sm:mr-2" />
                Pengguna
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="review" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Menunggu Tinjauan
                </CardTitle>
                <CardDescription>
                  Tinjau dan setujui inspeksi yang dikirim oleh petugas lapangan ({pendingCount} menunggu)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingInspections.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">Semua selesai!</p>
                    <p className="text-muted-foreground">Tidak ada inspeksi yang menunggu tinjauan</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingInspections.map((inspection) => (
                      <Card key={inspection.id} className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/20">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  checked={documentSelection.some((i) => i.id === inspection.id)}
                                  onChange={() => toggleDocumentSelection(inspection)}
                                />
                                <h3 className="font-semibold text-base sm:text-lg">{inspection.shipperName}</h3>
                                {getStatusBadge(inspection.status)}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                                <p>
                                  Komoditi:{" "}
                                  <span className="font-medium text-foreground">{inspection.commodityType}</span>
                                </p>
                                <p>
                                  Petugas: <span className="font-medium text-foreground">{inspection.createdBy}</span>
                                </p>
                                <p>
                                  Tanggal:{" "}
                                  <span className="font-medium text-foreground">
                                    {new Date(inspection.createdAt).toLocaleString("id-ID")}
                                  </span>
                                </p>
                                {inspection.location && (
                                  <p>
                                    Lokasi:{" "}
                                    {inspection.location.address ? (
                                      <>
                                        <span className="font-medium text-foreground">
                                          {inspection.location.address.street || inspection.location.address.name || "Jalan tidak diketahui"}, {inspection.location.address.city}
                                        </span>
                                        <span className="block text-xs text-muted-foreground mt-0.5">
                                          {inspection.location.latitude?.toFixed(6) || "-"}, {inspection.location.longitude?.toFixed(6) || "-"}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="font-medium text-foreground">
                                        {inspection.location.latitude?.toFixed(6) || "-"}, {inspection.location.longitude?.toFixed(6) || "-"}
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                              {inspection.notes && (
                                <p className="text-xs sm:text-sm bg-muted p-2 rounded mt-2">Catatan: {inspection.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border justify-end w-full sm:w-auto">
                              <Button variant="outline" size="sm" onClick={() => setSelectedInspection(inspection)} className="text-xs sm:text-sm">
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                Lihat
                              </Button>
                              <Button size="sm" onClick={() => handleOpenReview(inspection)} className="bg-primary text-primary-foreground text-xs sm:text-sm">
                                Tinjau
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(inspection.id)} className="text-xs sm:text-sm">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form" className="mt-8">
            <InspectionForm onSave={handleSaveInspection} onSelect={handleSelectInspection} />
          </TabsContent>

          <TabsContent value="history" className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Semua Inspeksi</CardTitle>
                <CardDescription>
                  Lihat semua inspeksi dari semua verifikator ({inspections.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InspectionFilters
                  onFilterChange={handleFilterChange}
                  showCreatedByFilter={true}
                  verificatorOptions={verificatorOptions}
                />
                {inspections.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada inspeksi</p>
                ) : (
                  <div className="space-y-4">
                    {inspections.map((inspection) => (
                      <Card key={inspection.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  checked={documentSelection.some((i) => i.id === inspection.id)}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    toggleDocumentSelection(inspection)
                                  }}
                                />
                                <h3 className="font-semibold text-base sm:text-lg">{inspection.shipperName}</h3>
                                {getStatusBadge(inspection.status)}
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {inspection.commodityType} | Oleh: {inspection.createdBy} |{" "}
                                {new Date(inspection.createdAt).toLocaleString("id-ID")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border justify-end w-full sm:w-auto">
                              <Button variant="outline" size="sm" onClick={() => setSelectedInspection(inspection)} className="text-xs sm:text-sm">
                                Lihat
                              </Button>
                              {inspection.status !== "approved" && (
                                <Button size="sm" variant="secondary" onClick={() => handleOpenReview(inspection)} className="text-xs sm:text-sm">
                                  Tinjau
                                </Button>
                              )}
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(inspection.id)} className="text-xs sm:text-sm">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-8">
            <UserManagement />
          </TabsContent>
        </Tabs>

        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Verifikasi & Tinjau Inspeksi
              </DialogTitle>
              <DialogDescription>
                Tinjau foto bukti dan data inspeksi dari {reviewingInspection?.createdBy}
              </DialogDescription>
            </DialogHeader>

            {reviewingInspection && (
              <div className="space-y-4">
                <div className="bg-muted/60 p-4 rounded-lg border border-border">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-base">{reviewingInspection.shipperName}</h4>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                      No. {reviewingInspection.containerNumber || "-"}
                    </span>
                  </div>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Komoditi: <span className="font-medium text-foreground">{reviewingInspection.commodityType}</span></p>
                    <p>Dikirim oleh: <span className="font-medium text-foreground">{reviewingInspection.createdBy}</span></p>
                    <p>Tanggal: <span className="font-medium text-foreground">{new Date(reviewingInspection.createdAt).toLocaleString("id-ID")}</span></p>
                    {reviewingInspection.notes && <p className="mt-1 text-foreground bg-background p-2 rounded border">Catatan: {reviewingInspection.notes}</p>}
                  </div>
                </div>

                {/* Photo Verification Gallery */}
                {reviewingInspection.photos && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">
                      📷 Verifikasi Foto Bukti Kontainer
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-2 bg-muted/40 rounded-lg border border-border">
                      {Object.entries(reviewingInspection.photos).map(([key, url]) => {
                        if (!url) return null
                        const labels: Record<string, string> = {
                          shipper: "Foto Packing Tag",
                          containerNumber: "No. Kontainer Plate",
                          commodity: "Foto Komoditi",
                          ispm: "Stempel ISPM",
                          stacking: "Foto Stacking",
                          slicing: "Foto Slicing / Test",
                        }
                        return (
                          <div key={key} className="border rounded-md overflow-hidden bg-background shadow-xs">
                            <a href={url} target="_blank" rel="noreferrer" title="Klik untuk lihat foto penuh">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={labels[key] || key} className="w-full h-24 object-cover hover:opacity-90 transition-opacity" />
                            </a>
                            <div className="p-1.5 bg-background text-center border-t border-border">
                              <p className="text-[11px] font-medium truncate text-foreground">{labels[key] || key}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Catatan / Komentar Admin</label>
                  <Textarea
                    placeholder="Wajib diisi jika meminta perbaikan (misal: Foto kurang jelas, mohon upload ulang foto nomor kontainer)..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Berikan masukan mendalam jika data/foto kurang sesuai</p>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button variant="destructive" onClick={handleRequestCorrection} disabled={!adminNotes.trim()} className="w-full sm:w-auto">
                <AlertCircle className="h-4 w-4 mr-2" />
                Minta Perbaikan
              </Button>
              <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
                <CheckCircle className="h-4 w-4 mr-2" />
                Benar (Setujui)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showDocumentPreview} onOpenChange={setShowDocumentPreview}>
          <DialogContent className="sm:max-w-[908px] max-w-[908px] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pratinjau Dokumen ({documentSelection.length} item{documentSelection.length > 1 ? 's' : ''})</DialogTitle>
              <DialogDescription>
                Tinjau dan cetak dokumen verifikasi untuk inspeksi yang dipilih.
              </DialogDescription>
            </DialogHeader>
            <VerificationDocument inspections={documentSelection} />
          </DialogContent>
        </Dialog>

        {documentSelection.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
            <span className="font-medium">{documentSelection.length} inspeksi dipilih</span>
            <div className="h-4 w-px bg-background/20" />
            <button
              onClick={clearDocumentSelection}
              className="hover:text-primary-foreground/80 text-sm font-medium transition-colors"
            >
              Hapus
            </button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowDocumentPreview(true)}
              className="ml-2"
            >
              <FileText className="h-4 w-4 mr-2" />
              Lihat Dokumen
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
