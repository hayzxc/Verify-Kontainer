"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Camera, CheckCircle2, CloudUpload, CloudOff, Loader2, Plus, ImageIcon } from "lucide-react"
import { compressImageBase64, getBase64ByteSize, formatFileSize } from "@/lib/image-compression"
import { isNativePlatform, captureNativePhoto } from "@/lib/capacitor-bridge"
import { useAuth } from "@/lib/auth-context"
import type { PhotoValue } from "@/types/inspection"
import { normalizePhotos } from "@/types/inspection"

interface PhotoUploadProps {
  label: string
  photoType: string
  /** Accepts legacy single string, array, or null */
  photo: PhotoValue
  /** Called with the photoType and the new array of photo URLs (or null if empty) */
  onCapture: (photoType: string, photos: PhotoValue) => void
  /** Maximum photos allowed in this slot (default: 5) */
  maxPhotos?: number
  /** Whether gallery upload is allowed (defaults to true) */
  allowGallery?: boolean
  /** Callback to notify parent about upload in-progress state */
  onUploadingChange?: (photoType: string, isUploading: boolean) => void
}

interface PhotoEntry {
  /** Unique id for React keys */
  id: string
  /** The preview source – base64 while uploading, cloud URL after */
  src: string
  /** Whether this entry is currently uploading to cloud */
  isUploading: boolean
  /** Whether cloud upload failed */
  uploadError: boolean
  /** Whether stored in cloud already */
  isCloud: boolean
}

const isCloudUrl = (s: string) => s.startsWith("http")
let _entryId = 0
const nextId = () => `photo-${++_entryId}-${Date.now()}`

export function PhotoUpload({
  label,
  photoType,
  photo,
  onCapture,
  maxPhotos = 5,
  allowGallery,
  onUploadingChange,
}: PhotoUploadProps) {
  const { user } = useAuth()
  const isPrivileged = user?.role === "verificator" || user?.role === "admin"
  // Gallery upload is strictly restricted to admin and verificator roles; regular users must use camera
  const canUseGallery = isPrivileged && (allowGallery !== undefined ? allowGallery : true)

  const [entries, setEntries] = useState<PhotoEntry[]>([])
  const entriesRef = useRef<PhotoEntry[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isCamera, setIsCamera] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  // Sync external photo prop → internal entries (only on mount / prop change from parent)
  useEffect(() => {
    const urls = normalizePhotos(photo)
    const currentUrls = entriesRef.current.map((e) => e.src)
    const isSame =
      urls.length === currentUrls.length &&
      urls.every((u, idx) => u === currentUrls[idx])

    if (isSame) return

    const mapped = urls.map((src) => {
      const existing = entriesRef.current.find((e) => e.src === src)
      return {
        id: existing?.id || nextId(),
        src,
        isUploading: false,
        uploadError: false,
        isCloud: isCloudUrl(src),
      }
    })
    entriesRef.current = mapped
    setEntries(mapped)
  }, [photo])

  /** Emit the current entry list back to the parent */
  const emitChange = useCallback(
    (updated: PhotoEntry[]) => {
      const urls = updated.map((e) => e.src).filter(Boolean)
      if (urls.length === 0) {
        onCapture(photoType, null)
      } else if (urls.length === 1) {
        // Backward compatible: single photo emits as plain string
        onCapture(photoType, urls[0])
      } else {
        onCapture(photoType, urls)
      }
    },
    [onCapture, photoType]
  )

  // ─── Cloud Upload ─────────────────────────────────────────────
  const uploadToCloud = useCallback(
    async (base64: string): Promise<string | null> => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({
            base64,
            filename: `inspection-${photoType}-${Date.now()}.jpg`,
          }),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => null)
          const errorMsg = errData?.error?.message || errData?.message || `HTTP ${res.status}`
          console.error("[PhotoUpload] Server rejected upload:", errorMsg)
          throw new Error(errorMsg)
        }
        const data = await res.json()
        return data.data?.url ?? null
      } catch (err) {
        console.error("[PhotoUpload] Cloud upload failed:", err)
        return null
      }
    },
    [photoType]
  )

  /** Add a new photo (compressed base64), upload to cloud, then update entries */
  const addPhoto = useCallback(
    async (compressedData: string) => {
      const entryId = nextId()
      const newEntry: PhotoEntry = {
        id: entryId,
        src: compressedData,
        isUploading: true,
        uploadError: false,
        isCloud: false,
      }

      const nextList = [...entriesRef.current, newEntry]
      entriesRef.current = nextList
      setEntries(nextList)
      onUploadingChange?.(photoType, true)

      // Upload to cloud
      let cloudUrl: string | null = null
      try {
        cloudUrl = await uploadToCloud(compressedData)
      } finally {
        onUploadingChange?.(photoType, false)
      }

      const finalSrc = cloudUrl || compressedData
      const updated = entriesRef.current.map((e) =>
        e.id === entryId
          ? {
            ...e,
            src: finalSrc,
            isUploading: false,
            uploadError: !cloudUrl,
            isCloud: !!cloudUrl,
          }
          : e
      )
      entriesRef.current = updated
      setEntries(updated)
      emitChange(updated)
    },
    [photoType, emitChange, onUploadingChange, uploadToCloud]
  )

  // ─── Native Camera (Capacitor) ────────────────────────────────
  const captureNative = async () => {
    try {
      const rawNativeBase64 = await captureNativePhoto()
      if (rawNativeBase64) {
        setIsCompressing(true)
        const compressedData = await compressImageBase64(rawNativeBase64, 1280, 0.75)
        setIsCompressing(false)
        await addPhoto(compressedData)
      }
    } catch (nativeErr) {
      console.warn("[PhotoUpload] Native camera capture failed:", nativeErr)
    }
  }

  // ─── Web Camera ───────────────────────────────────────────────
  const startCamera = async () => {
    if (isNativePlatform()) {
      await captureNative()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      setIsCamera(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan pada peramban Anda.")
    }
  }

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        setIsCompressing(true)
        const video = videoRef.current
        const captureWidth = video.videoWidth || 1920
        const captureHeight = video.videoHeight || 1080
        canvasRef.current.width = captureWidth
        canvasRef.current.height = captureHeight
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"
        context.drawImage(video, 0, 0, captureWidth, captureHeight)
        const rawData = canvasRef.current.toDataURL("image/jpeg", 0.95)

        const compressedData = await compressImageBase64(rawData, 1280, 0.75)
        setIsCompressing(false)

        await addPhoto(compressedData)
        // Don't stop camera → user can take another photo immediately
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
    setIsCamera(false)
  }

  // ─── Gallery File Selection ────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUseGallery) {
      alert("Akses galeri hanya diizinkan untuk Admin dan Petugas Verifikator.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = maxPhotos - entries.length
    if (remainingSlots <= 0) {
      alert(`Maksimal ${maxPhotos} foto telah tercapai.`)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    setIsCompressing(true)

    try {
      for (const file of filesToProcess) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const compressed = await compressImageBase64(base64Data, 1280, 0.75)
        await addPhoto(compressed)
      }
    } catch (err) {
      console.error("[PhotoUpload] Error processing gallery photo:", err)
      alert("Gagal memproses foto dari galeri.")
    } finally {
      setIsCompressing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ─── Remove / Retry ───────────────────────────────────────────
  const removePhoto = (entryId: string) => {
    const updated = entriesRef.current.filter((e) => e.id !== entryId)
    entriesRef.current = updated
    setEntries(updated)
    emitChange(updated)
  }

  const retryUpload = async (entryId: string) => {
    const entry = entriesRef.current.find((e) => e.id === entryId)
    if (!entry || entry.isCloud) return

    const uploadingList = entriesRef.current.map((e) =>
      e.id === entryId ? { ...e, isUploading: true, uploadError: false } : e
    )
    entriesRef.current = uploadingList
    setEntries(uploadingList)

    onUploadingChange?.(photoType, true)
    let cloudUrl: string | null = null
    try {
      cloudUrl = await uploadToCloud(entry.src)
    } finally {
      onUploadingChange?.(photoType, false)
    }

    const finalSrc = cloudUrl || entry.src
    const updated = entriesRef.current.map((e) =>
      e.id === entryId
        ? {
          ...e,
          src: finalSrc,
          isUploading: false,
          uploadError: !cloudUrl,
          isCloud: !!cloudUrl,
        }
        : e
    )
    entriesRef.current = updated
    setEntries(updated)
    emitChange(updated)
  }

  const canAddMore = entries.length < maxPhotos

  // ─── Computed Values ──────────────────────────────────────────
  const totalLocalWeight = entries
    .filter((e) => !e.isCloud)
    .reduce((sum, e) => sum + getBase64ByteSize(e.src), 0)
  const hasLocalPhotos = totalLocalWeight > 0

  return (
    <Card className="p-3 sm:p-4 shadow-xs border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
        <label className="block text-xs sm:text-sm font-medium truncate">{label}</label>
        <div className="flex items-center gap-1.5 shrink-0">
          {entries.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono">
              {entries.length}/{maxPhotos}
            </span>
          )}
          {hasLocalPhotos && (
            <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded px-1.5 py-0.5 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              {formatFileSize(totalLocalWeight)}
            </span>
          )}
        </div>
      </div>

      {/* Compressing Indicator */}
      {isCompressing && (
        <div className="h-20 flex flex-col items-center justify-center bg-muted/40 rounded-lg gap-2 mb-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground animate-pulse">Mengompresi foto...</p>
        </div>
      )}

      {/* Photo Gallery Grid */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="relative bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.src}
                alt={label}
                className="w-full h-24 sm:h-32 object-cover rounded-md"
              />

              {/* Cloud status badge */}
              <div className="absolute top-1 left-1">
                {entry.isUploading ? (
                  <span className="text-[9px] text-blue-700 bg-blue-50/90 border border-blue-200 rounded px-1 py-0.5 flex items-center gap-0.5 font-mono backdrop-blur-xs">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Unggah…
                  </span>
                ) : entry.isCloud ? (
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded px-1 py-0.5 flex items-center gap-0.5 font-mono backdrop-blur-xs">
                    <CloudUpload className="w-2.5 h-2.5" />
                    Cloud
                  </span>
                ) : entry.uploadError ? (
                  <button
                    type="button"
                    onClick={() => retryUpload(entry.id)}
                    className="text-[9px] text-orange-700 bg-orange-50/90 border border-orange-200 rounded px-1 py-0.5 flex items-center gap-0.5 font-mono backdrop-blur-xs cursor-pointer hover:bg-orange-100"
                    title="Gagal mengunggah ke cloud, klik untuk coba lagi"
                  >
                    <CloudOff className="w-2.5 h-2.5" />
                    Retry
                  </button>
                ) : null}
              </div>

              {/* Delete button */}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removePhoto(entry.id)}
                className="absolute top-1 right-1 h-6 w-6 p-0 shadow-md opacity-80 group-hover:opacity-100 transition-opacity"
                title="Hapus Foto"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Camera View */}
      {isCamera && (
        <div className="space-y-2 mb-2">
          <video ref={videoRef} autoPlay playsInline className="w-full h-36 sm:h-48 bg-black rounded-lg object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2">
            <Button type="button" onClick={capturePhoto} variant="default" className="flex-1 text-xs sm:text-sm h-10">
              <Camera className="w-4 h-4 mr-1.5" />
              Jepret Foto
            </Button>
            <Button type="button" onClick={stopCamera} variant="outline" className="flex-1 text-xs sm:text-sm h-10 bg-transparent">
              Selesai
            </Button>
          </div>
          {entries.length > 0 && (
            <p className="text-[10px] text-center text-muted-foreground">
              Foto diambil: {entries.length}/{maxPhotos} • Tekan &quot;Jepret Foto&quot; untuk menambah lagi
            </p>
          )}
        </div>
      )}

      {/* Hidden file input for gallery upload (only if canUseGallery) */}
      {canUseGallery && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      )}

      {/* Action Buttons */}
      {!isCamera && (
        <div className="space-y-2">
          {entries.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-5 text-center bg-muted/20">
              <Camera className="w-6 h-6 sm:w-7 sm:h-7 mx-auto text-muted-foreground mb-1.5" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                {canUseGallery
                  ? "Ambil foto via kamera atau unggah dari galeri"
                  : "Ambil foto bukti langsung via kamera"}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                Maksimal {maxPhotos} foto per kategori
              </p>
            </div>
          )}
          {canAddMore && (
            canUseGallery ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={startCamera}
                  variant={entries.length === 0 ? "default" : "outline"}
                  className="w-full text-xs sm:text-sm h-10"
                >
                  <Camera className="w-4 h-4 mr-1.5" />
                  {entries.length === 0 ? "Buka Kamera" : `Kamera (${entries.length}/${maxPhotos})`}
                </Button>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full text-xs sm:text-sm h-10 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <ImageIcon className="w-4 h-4 mr-1.5 text-blue-500" />
                  Pilih Galeri
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={startCamera}
                variant={entries.length === 0 ? "default" : "outline"}
                className="w-full text-xs sm:text-sm h-10"
              >
                {entries.length === 0 ? (
                  <>
                    <Camera className="w-4 h-4 mr-1.5" />
                    Buka Kamera
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Tambah Foto ({entries.length}/{maxPhotos})
                  </>
                )}
              </Button>
            )
          )}
          {!canAddMore && (
            <p className="text-[10px] text-center text-amber-600 dark:text-amber-400">
              Maksimal {maxPhotos} foto tercapai
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
