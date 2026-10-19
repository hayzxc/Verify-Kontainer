"use client"

import { useState, useCallback, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhotoUpload } from "./photo-upload"
import { LocationTracker } from "./location-tracker"
import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { MapPin, Camera, TreePine, Plus, ImagePlus, Calendar } from "lucide-react"
import type { InspectionData, LocationData, PhotoValue } from "@/types/inspection"

interface InspectionFormProps {
  onSave: (data: InspectionData) => Promise<void> | void
  onSelect: (data: InspectionData) => void
  initialData?: InspectionData
}

export function InspectionForm({ onSave, onSelect, initialData }: InspectionFormProps) {
  const { user } = useAuth()
  const isVerificatorOrAdmin = user?.role === "verificator" || user?.role === "admin"

  // Track photo types that are currently uploading to cloud storage
  const [uploadingTypes, setUploadingTypes] = useState<Set<string>>(new Set())
  const handleUploadingChange = (photoType: string, isUploading: boolean) => {
    setUploadingTypes((prev) => {
      const next = new Set(prev)
      if (isUploading) next.add(photoType)
      else next.delete(photoType)
      return next
    })
  }
  const isUploadingPhotos = uploadingTypes.size > 0

  const toLocalDatetimeString = (date: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, "0")
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [customDateTime, setCustomDateTime] = useState<string>(() =>
    initialData?.createdAt
      ? toLocalDatetimeString(new Date(initialData.createdAt))
      : toLocalDatetimeString(new Date())
  )
  const [formData, setFormData] = useState<InspectionData>({
    shipperName: "",
    commodityType: "",
    containerNumber: "",
    inspectionLocationType: "",
    inspectionLocationName: "",
    verificationStage: "awal",
    notes: "",
    location: null,
    photos: {
      shipper: null,
      containerNumber: null,
      commodity: null,
      ispm: null,
      stacking: null,
      slicing: null,
    },
    stackingDescription: "",
    slicingDescription: "",
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        photos: initialData.photos || prev.photos
      }))
      if (initialData.createdAt) {
        setCustomDateTime(toLocalDatetimeString(new Date(initialData.createdAt)))
      }
    } else {
      setFormData({
        shipperName: "",
        commodityType: "",
        containerNumber: "",
        inspectionLocationType: "",
        inspectionLocationName: "",
        verificationStage: "awal",
        notes: "",
        location: null,
        photos: {
          shipper: null,
          containerNumber: null,
          commodity: null,
          ispm: null,
          stacking: null,
          slicing: null,
        },
        stackingDescription: "",
        slicingDescription: "",
      })
    }
  }, [initialData])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<"submit" | "submit_and_add">("submit")

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoCapture = useCallback((photoType: string, photo: PhotoValue) => {
    setFormData((prev) => ({
      ...prev,
      photos: { ...prev.photos, [photoType]: photo },
    }))
  }, [])

  const handleLocationUpdate = (location: LocationData) => {
    setFormData((prev) => ({ ...prev, location }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // 1. Validate required fields
    if (!formData.shipperName?.trim()) {
      alert("Nama Shipper wajib diisi.")
      return
    }
    if (!formData.containerNumber?.trim()) {
      alert("Nomor Container wajib diisi.")
      return
    }
    if (!formData.commodityType?.trim()) {
      alert("Silakan pilih Jenis Komoditi terlebih dahulu.")
      return
    }

    // 2. Check if photos are currently uploading to cloud
    if (isUploadingPhotos) {
      alert("Mohon tunggu sebentar, foto sedang diunggah ke cloud storage...")
      return
    }

    // 3. Prevent submission if any photo failed to upload and remains in base64 format
    const hasUnuploadedPhotos = Object.values(formData.photos || {}).some((val) => {
      if (!val) return false
      if (typeof val === "string") return val.startsWith("data:")
      if (Array.isArray(val)) return val.some((v) => typeof v === "string" && v.startsWith("data:"))
      return false
    })

    if (hasUnuploadedPhotos) {
      alert(
        "Terdapat foto yang belum berhasil diunggah ke cloud storage (ditandai tombol 'Retry'). Silakan klik tombol 'Retry' pada foto tersebut terlebih dahulu sebelum mengirim inspeksi."
      )
      return
    }

    setIsSubmitting(true)

    const targetDate = isVerificatorOrAdmin && customDateTime ? new Date(customDateTime) : new Date()

    const inspection: InspectionData = {
      ...formData,
      createdAt: targetDate.toISOString(),
      timestamp: targetDate.toLocaleString("id-ID"),
      date: targetDate.toLocaleDateString("id-ID"),
      time: targetDate.toLocaleTimeString("id-ID"),
    }

    try {
      // Await saving to backend before modifying local state
      await onSave(inspection)
      onSelect(inspection)

      if (submitAction === "submit_and_add") {
        setFormData((prev) => ({
          ...prev,
          containerNumber: "",
          photos: {
            shipper: null,
            containerNumber: null,
            commodity: null,
            ispm: null,
            stacking: null,
            slicing: null,
            additionalPhotos: [],
          },
          stackingDescription: "",
          slicingDescription: "",
          // Keep shipperName, commodityType, notes, and location
        }))
      } else {
        setFormData({
          shipperName: "",
          commodityType: "",
          containerNumber: "",
          inspectionLocationType: "",
          inspectionLocationName: "",
          verificationStage: "awal",
          notes: "",
          location: null,
          photos: {
            shipper: null,
            containerNumber: null,
            commodity: null,
            ispm: null,
            stacking: null,
            slicing: null,
            additionalPhotos: [],
          },
          stackingDescription: "",
          slicingDescription: "",
        })
      }
    } catch (error) {
      console.error("Error saving inspection:", error)
      // Do not clear formData on failure so user does not lose input
    } finally {
      setIsSubmitting(false)
    }
  }

  const isWoodCommodity = formData.commodityType === "kayu"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entri Inspeksi Kontainer</CardTitle>
          <CardDescription>Buat catatan inspeksi baru</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shipperName">Nama Shipper</Label>
                <Input
                  id="shipperName"
                  name="shipperName"
                  placeholder="Masukkan nama shipper"
                  value={formData.shipperName}
                  onChange={handleInputChange}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="containerNumber">Nomor Container</Label>
                <Input
                  id="containerNumber"
                  name="containerNumber"
                  placeholder="Contoh: ABCD1234567"
                  value={formData.containerNumber}
                  onChange={handleInputChange}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="verificationStage">Tahap Verifikasi</Label>
                <Select
                  value={formData.verificationStage || "awal"}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, verificationStage: value as "awal" | "akhir" }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih Tahap Verifikasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awal">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Verifikasi Awal
                      </span>
                    </SelectItem>
                    <SelectItem value="akhir">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Verifikasi Akhir
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="commodityType">Jenis Komoditi</Label>
                <Select
                  value={formData.commodityType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, commodityType: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih komoditi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kayu">Kayu</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="elektronik">Elektronik</SelectItem>
                    <SelectItem value="tekstil">Tekstil</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="inspectionLocationType">Tipe Lokasi Pemeriksaan</Label>
                <Select
                  value={formData.inspectionLocationType || ""}
                  onValueChange={(value) => setFormData((prev) => ({
                    ...prev,
                    inspectionLocationType: value as "depo" | "pabrik",
                    inspectionLocationName: value === "depo" ? "Depo SPP" : ""
                  }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih Tipe Lokasi (Depo / Pabrik)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="depo">Depo</SelectItem>
                    <SelectItem value="pabrik">Pabrik</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.inspectionLocationType === "depo" && (
                <div>
                  <Label htmlFor="inspectionLocationName">Pilih Depo</Label>
                  <Select
                    value={formData.inspectionLocationName || "Depo SPP"}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, inspectionLocationName: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Pilih Depo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Depo SPP">Depo SPP</SelectItem>
                      <SelectItem value="Depo Patriot">Depo Patriot</SelectItem>
                      <SelectItem value="Depo DSS">Depo DSS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.inspectionLocationType === "pabrik" && (
                <div>
                  <Label htmlFor="inspectionLocationName">Nama / Detail Pabrik</Label>
                  <Input
                    id="inspectionLocationName"
                    name="inspectionLocationName"
                    placeholder="Masukkan nama / lokasi pabrik"
                    value={formData.inspectionLocationName || ""}
                    onChange={handleInputChange}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Catatan Tambahan</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Tambahkan catatan atau observasi khusus"
                value={formData.notes}
                onChange={handleInputChange}
                className="mt-2 min-h-24"
              />
            </div>

            {/* Custom Upload Date & Time (Khusus Petugas Verifikator / Admin) */}
            {isVerificatorOrAdmin && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <Label htmlFor="customDateTime" className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100">
                      Waktu Upload & Inspeksi (Khusus Verifikator)
                    </Label>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                    Upload Galeri & Tanggal Kustom Aktif
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Jika foto diunggah manual dari galeri ponsel/perangkat, Anda dapat menyesuaikan tanggal dan jam pengambilan foto di bawah ini.
                </p>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-1">
                  <Input
                    id="customDateTime"
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="text-xs sm:text-sm max-w-xs bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomDateTime(toLocalDatetimeString(new Date()))}
                    className="text-xs h-9"
                  >
                    Set Waktu Sekarang
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Dokumentasi Utama
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <PhotoUpload
                  label="Foto Packing"
                  photoType="shipper"
                  photo={formData.photos.shipper}
                  onCapture={handlePhotoCapture}
                  onUploadingChange={handleUploadingChange}
                />
                <PhotoUpload
                  label="Foto Container"
                  photoType="containerNumber"
                  photo={formData.photos.containerNumber}
                  onCapture={handlePhotoCapture}
                  onUploadingChange={handleUploadingChange}
                />
                <PhotoUpload
                  label="Foto Komoditi"
                  photoType="commodity"
                  photo={formData.photos.commodity}
                  onCapture={handlePhotoCapture}
                  onUploadingChange={handleUploadingChange}
                />
                <PhotoUpload
                  label="Foto Stempel ISPM"
                  photoType="ispm"
                  photo={formData.photos.ispm}
                  onCapture={handlePhotoCapture}
                  onUploadingChange={handleUploadingChange}
                />
              </div>
            </div>

            {isWoodCommodity && (
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                  <TreePine className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  Dokumentasi Khusus Kayu
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <PhotoUpload
                      label="Foto Stacking"
                      photoType="stacking"
                      photo={formData.photos.stacking}
                      onCapture={handlePhotoCapture}
                      onUploadingChange={handleUploadingChange}
                    />
                    <div>
                      <Label htmlFor="stackingDescription" className="text-xs sm:text-sm font-medium">Deskripsi Stacking</Label>
                      <Textarea
                        id="stackingDescription"
                        name="stackingDescription"
                        placeholder="Deskripsikan kondisi stacking kayu..."
                        value={formData.stackingDescription}
                        onChange={handleInputChange}
                        className="mt-1.5 min-h-20 text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <PhotoUpload
                      label="Foto Perforasi"
                      photoType="slicing"
                      photo={formData.photos.slicing}
                      onCapture={handlePhotoCapture}
                      onUploadingChange={handleUploadingChange}
                    />
                    <div>
                      <Label htmlFor="slicingDescription" className="text-xs sm:text-sm font-medium">Deskripsi Perforasi</Label>
                      <Textarea
                        id="slicingDescription"
                        name="slicingDescription"
                        placeholder="Deskripsikan kondisi perforasi kayu..."
                        value={formData.slicingDescription}
                        onChange={handleInputChange}
                        className="mt-1.5 min-h-20 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Documentation Photos */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                Dokumentasi Tambahan
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Foto bukti tambahan yang tidak termasuk kategori utama di atas (opsional).
              </p>
              <PhotoUpload
                label="Foto Tambahan"
                photoType="additionalPhotos"
                photo={formData.photos.additionalPhotos || null}
                onCapture={handlePhotoCapture}
                onUploadingChange={handleUploadingChange}
                maxPhotos={10}
              />
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Lokasi & Waktu
              </h3>
              <LocationTracker onLocationUpdate={handleLocationUpdate} location={formData.location} />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingPhotos}
                onClick={() => setSubmitAction("submit")}
                className="w-full sm:w-auto h-11 text-sm font-medium"
              >
                {isUploadingPhotos
                  ? "Mengunggah Foto..."
                  : isSubmitting && submitAction === "submit"
                  ? "Menyimpan..."
                  : "Kirim Inspeksi Ke Admin"}
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting || isUploadingPhotos}
                onClick={() => setSubmitAction("submit_and_add")}
                className="w-full sm:w-auto h-11 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Simpan & Tambah Kontainer Lagi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
