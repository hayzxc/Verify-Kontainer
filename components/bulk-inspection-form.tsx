"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhotoUpload } from "./photo-upload"
import { LocationTracker } from "./location-tracker"
import { useAuth } from "@/lib/auth-context"
import { MapPin, Camera, TreePine, Upload, FileText, ImagePlus, Calendar } from "lucide-react"
import type { BulkInspectionData, LocationData, PhotoValue } from "@/types/inspection"

interface BulkInspectionFormProps {
    onSave: (data: BulkInspectionData) => void
}

export function BulkInspectionForm({ onSave }: BulkInspectionFormProps) {
    const { user } = useAuth()
    const isVerificatorOrAdmin = user?.role === "verificator" || user?.role === "admin"

    const toLocalDatetimeString = (date: Date = new Date()) => {
        const pad = (n: number) => String(n).padStart(2, "0")
        const year = date.getFullYear()
        const month = pad(date.getMonth() + 1)
        const day = pad(date.getDate())
        const hours = pad(date.getHours())
        const minutes = pad(date.getMinutes())
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const [customDateTime, setCustomDateTime] = useState<string>(() => toLocalDatetimeString(new Date()))
    const [formData, setFormData] = useState<Omit<BulkInspectionData, "containerNumbers"> & { containerNumbersText: string }>({
        shipperName: "",
        commodityType: "",
        inspectionLocationType: "",
        inspectionLocationName: "",
        verificationStage: "awal",
        containerNumbersText: "",
        notes: "",
        location: null,
        photos: {
            shipper: null,
            commodity: null,
            ispm: null,
            stacking: null,
            slicing: null,
        },
        stackingDescription: "",
        slicingDescription: "",
    })

    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handlePhotoCapture = (photoType: string, photo: PhotoValue) => {
        setFormData((prev) => ({
            ...prev,
            photos: { ...prev.photos, [photoType]: photo },
        }))
    }

    const handleLocationUpdate = (location: LocationData) => {
        setFormData((prev) => ({ ...prev, location }))
    }

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const text = await file.text()
        // Simple split by newline and filter empty
        // If it's CSV, we might need more robust parsing, but for now assume list of numbers or "column1, column2" where we try to find the container number column?
        // Let's assume simple text file with one container per line for now.
        // Or if CSV, we treat it as text and let user edit.
        setFormData(prev => ({ ...prev, containerNumbersText: text }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!formData.shipperName?.trim()) {
            alert("Nama Pengirim (Shipper) wajib diisi.")
            return
        }

        if (!formData.commodityType?.trim()) {
            alert("Silakan pilih Jenis Komoditi terlebih dahulu.")
            return
        }

        // Parse container numbers
        const containerNumbers = formData.containerNumbersText
            .split(/[\n,]+/) // Split by newline or comma
            .map(s => s.trim())
            .filter(s => s.length > 0)

        if (containerNumbers.length === 0) {
            alert("Mohon masukkan minimal satu nomor kontainer.")
            return
        }

        setIsSubmitting(true)

        const targetDate = isVerificatorOrAdmin && customDateTime ? new Date(customDateTime) : new Date()

        const bulkData: BulkInspectionData = {
            shipperName: formData.shipperName,
            commodityType: formData.commodityType,
            inspectionLocationType: formData.inspectionLocationType,
            inspectionLocationName: formData.inspectionLocationName,
            verificationStage: formData.verificationStage || "awal",
            containerNumbers,
            notes: formData.notes,
            location: formData.location,
            photos: formData.photos,
            stackingDescription: formData.stackingDescription,
            slicingDescription: formData.slicingDescription,
            createdAt: targetDate.toISOString(),
        }

        try {
            await onSave(bulkData)
        } catch (error) {
            console.error("Error preparing bulk inspection:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const isWoodCommodity = formData.commodityType === "kayu"

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Entri Inspeksi Massal</CardTitle>
                    <CardDescription>Buat beberapa inspeksi untuk pengirim yang sama</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="shipperName">Nama Pengirim (Shipper)</Label>
                                <Input
                                    id="shipperName"
                                    name="shipperName"
                                    value={formData.shipperName}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: PT. Sumber Makmur"
                                    className="mt-2"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="bulkVerificationStage">Tahap Verifikasi</Label>
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
                            <Label htmlFor="containerNumbersText" className="flex justify-between items-center">
                                <span>Nomor Container (Satu per baris atau pisahkan dengan koma)</span>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="file-upload" className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1">
                                        <Upload className="w-3 h-3" /> Unggah Teks/CSV
                                    </Label>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        accept=".txt,.csv"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </Label>
                            <Textarea
                                id="containerNumbersText"
                                name="containerNumbersText"
                                placeholder="ABCD1234567&#10;WXYZ9876543"
                                value={formData.containerNumbersText}
                                onChange={handleInputChange}
                                required
                                className="mt-2 min-h-32 font-mono"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Terdeteksi: {formData.containerNumbersText.split(/[\n,]+/).filter(s => s.trim().length > 0).length} kontainer
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="notes">Catatan Tambahan (Berbagi)</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                placeholder="Tambahkan catatan untuk semua kontainer ini"
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
                                        <Label htmlFor="bulkCustomDateTime" className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100">
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
                                        id="bulkCustomDateTime"
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
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Camera className="w-5 h-5" />
                                Dokumentasi Berbagi
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Foto-foto ini akan diterapkan ke SEMUA kontainer dalam unggahan massal ini.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <PhotoUpload
                                    label="Foto Packing"
                                    photoType="shipper"
                                    photo={formData.photos.shipper || null}
                                    onCapture={handlePhotoCapture}
                                />
                                {/* No Container Number Photo here */}
                                <PhotoUpload
                                    label="Foto Komoditi"
                                    photoType="commodity"
                                    photo={formData.photos.commodity || null}
                                    onCapture={handlePhotoCapture}
                                />
                                <PhotoUpload
                                    label="Foto ISPM"
                                    photoType="ispm"
                                    photo={formData.photos.ispm || null}
                                    onCapture={handlePhotoCapture}
                                />
                            </div>
                        </div>

                        {isWoodCommodity && (
                            <div className="pt-4 border-t border-border">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <TreePine className="w-5 h-5" />
                                    Dokumentasi Khusus Kayu (Berbagi)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <PhotoUpload
                                            label="Foto Stacking"
                                            photoType="stacking"
                                            photo={formData.photos.stacking || null}
                                            onCapture={handlePhotoCapture}
                                        />
                                        <div>
                                            <Label htmlFor="stackingDescription">Deskripsi Stacking</Label>
                                            <Textarea
                                                id="stackingDescription"
                                                name="stackingDescription"
                                                placeholder="Deskripsikan kondisi stacking..."
                                                value={formData.stackingDescription}
                                                onChange={handleInputChange}
                                                className="mt-2 min-h-20"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <PhotoUpload
                                            label="Foto Perforasi"
                                            photoType="slicing"
                                            photo={formData.photos.slicing || null}
                                            onCapture={handlePhotoCapture}
                                        />
                                        <div>
                                            <Label htmlFor="slicingDescription">Deskripsi Perforasi</Label>
                                            <Textarea
                                                id="slicingDescription"
                                                name="slicingDescription"
                                                placeholder="Deskripsikan kondisi perforasi..."
                                                value={formData.slicingDescription}
                                                onChange={handleInputChange}
                                                className="mt-2 min-h-20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Additional Documentation Photos */}
                        <div className="pt-4 border-t border-border">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <ImagePlus className="w-5 h-5 text-indigo-500" />
                                Dokumentasi Tambahan (Berbagi)
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Foto bukti tambahan untuk SEMUA kontainer (opsional).
                            </p>
                            <PhotoUpload
                                label="Foto Tambahan"
                                photoType="additionalPhotos"
                                photo={formData.photos.additionalPhotos || null}
                                onCapture={handlePhotoCapture}
                                maxPhotos={10}
                            />
                        </div>

                        <div className="pt-4 border-t border-border">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Lokasi & Waktu
                            </h3>
                            <LocationTracker onLocationUpdate={handleLocationUpdate} location={formData.location} />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-border">
                            <Button type="submit" disabled={isSubmitting} className="flex-1">
                                {isSubmitting ? "Memproses..." : "Buat Inspeksi Massal"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
