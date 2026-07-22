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
import { MapPin, Camera, TreePine, Plus } from "lucide-react"
import type { InspectionData, LocationData } from "@/types/inspection"

interface InspectionFormProps {
  onSave: (data: InspectionData) => void
  onSelect: (data: InspectionData) => void
  initialData?: InspectionData
}

import { useEffect } from "react"

export function InspectionForm({ onSave, onSelect, initialData }: InspectionFormProps) {
  const [formData, setFormData] = useState<InspectionData>({
    shipperName: "",
    commodityType: "",
    containerNumber: "",
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
    } else {
      setFormData({
        shipperName: "",
        commodityType: "",
        containerNumber: "",
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

  const handlePhotoCapture = (photoType: string, photo: string | null) => {
    setFormData((prev) => ({
      ...prev,
      photos: { ...prev.photos, [photoType]: photo },
    }))
  }

  const handleLocationUpdate = (location: LocationData) => {
    setFormData((prev) => ({ ...prev, location }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const inspection: InspectionData = {
      ...formData,
      timestamp: new Date().toLocaleString("id-ID"),
      date: new Date().toLocaleDateString("id-ID"),
      time: new Date().toLocaleTimeString("id-ID"),
    }

    try {
      onSave(inspection)
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
    } catch (error) {
      console.error("Error saving inspection:", error)
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

            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold mb-3 text-sm sm:text-base flex items-center gap-2">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Dokumentasi Utama
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <PhotoUpload
                  label="Foto Packing Tag"
                  photoType="shipper"
                  photo={formData.photos.shipper}
                  onCapture={handlePhotoCapture}
                />
                <PhotoUpload
                  label="Foto No. Container Plate"
                  photoType="containerNumber"
                  photo={formData.photos.containerNumber}
                  onCapture={handlePhotoCapture}
                />
                <PhotoUpload
                  label="Foto Komoditi"
                  photoType="commodity"
                  photo={formData.photos.commodity}
                  onCapture={handlePhotoCapture}
                />
                <PhotoUpload
                  label="Foto Stempel ISPM"
                  photoType="ispm"
                  photo={formData.photos.ispm}
                  onCapture={handlePhotoCapture}
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
                      label="Foto Slicing"
                      photoType="slicing"
                      photo={formData.photos.slicing}
                      onCapture={handlePhotoCapture}
                    />
                    <div>
                      <Label htmlFor="slicingDescription" className="text-xs sm:text-sm font-medium">Deskripsi Slicing</Label>
                      <Textarea
                        id="slicingDescription"
                        name="slicingDescription"
                        placeholder="Deskripsikan kondisi slicing kayu..."
                        value={formData.slicingDescription}
                        onChange={handleInputChange}
                        className="mt-1.5 min-h-20 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                disabled={isSubmitting}
                onClick={() => setSubmitAction("submit")}
                className="w-full sm:w-auto h-11 text-sm font-medium"
              >
                {isSubmitting && submitAction === "submit" ? "Menyimpan..." : "Kirim Inspeksi Ke Admin"}
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
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
