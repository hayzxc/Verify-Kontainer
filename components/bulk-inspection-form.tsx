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
import { MapPin, Camera, TreePine, Upload, FileText } from "lucide-react"
import type { BulkInspectionData, LocationData } from "@/types/inspection"

interface BulkInspectionFormProps {
    onSave: (data: BulkInspectionData) => void
}

export function BulkInspectionForm({ onSave }: BulkInspectionFormProps) {
    const [formData, setFormData] = useState<Omit<BulkInspectionData, "containerNumbers"> & { containerNumbersText: string }>({
        shipperName: "",
        commodityType: "",
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

    const handlePhotoCapture = (photoType: string, photo: string | null) => {
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
        setIsSubmitting(true)

        // Parse container numbers
        const containerNumbers = formData.containerNumbersText
            .split(/[\n,]+/) // Split by newline or comma
            .map(s => s.trim())
            .filter(s => s.length > 0)

        if (containerNumbers.length === 0) {
            alert("Please enter at least one container number.")
            setIsSubmitting(false)
            return
        }

        const bulkData: BulkInspectionData = {
            shipperName: formData.shipperName,
            commodityType: formData.commodityType,
            containerNumbers,
            notes: formData.notes,
            location: formData.location,
            photos: formData.photos,
            stackingDescription: formData.stackingDescription,
            slicingDescription: formData.slicingDescription,
        }

        try {
            // We will call the API from the parent or here?
            // Let's call it here inside the component or pass the data up.
            // The prop is `onSave: (count) => void`.
            // So I should call API here.
            // But `VerificatorDashboard` has the `user` context.
            // I need pass `user` or use `useAuth`.
            // I'll leave the API call to the dashboard component to keep it consistent with `InspectionForm` (which calls `onSave` but `VerificatorDashboard` does the fetch).
            // Wait, `InspectionForm` creates the object and calls `onSave`. `VerificatorDashboard` does the fetch.
            // So I should pass `bulkData` to `onSave`.
            // But `InspectionForm`'s `onSave` takes `InspectionData`.
            // `BulkInspectionForm`'s `onSave` should probably take `BulkInspectionData`.
            // I'll adjust the props interface above.
            // Actually, let's change the pattern. `VerificatorDashboard` expects `onSave` for single inspection.
            // I'll create a new handler in `VerificatorDashboard` for bulk.
            // For this component, I'll pass `onSave` that takes `BulkInspectionData`.
            onSave(bulkData)
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
                                            label="Foto Slicing"
                                            photoType="slicing"
                                            photo={formData.photos.slicing || null}
                                            onCapture={handlePhotoCapture}
                                        />
                                        <div>
                                            <Label htmlFor="slicingDescription">Deskripsi Slicing</Label>
                                            <Textarea
                                                id="slicingDescription"
                                                name="slicingDescription"
                                                placeholder="Deskripsikan kondisi slicing..."
                                                value={formData.slicingDescription}
                                                onChange={handleInputChange}
                                                className="mt-2 min-h-20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
