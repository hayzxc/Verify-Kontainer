"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Camera, CheckCircle2, CloudUpload, CloudOff, Loader2 } from "lucide-react"
import { compressImageBase64, getBase64ByteSize, formatFileSize } from "@/lib/image-compression"
import { isNativePlatform, captureNativePhoto } from "@/lib/capacitor-bridge"

interface PhotoUploadProps {
  label: string
  photoType: string
  photo: string | null
  onCapture: (photoType: string, photo: string | null) => void
}

export function PhotoUpload({ label, photoType, photo, onCapture }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(photo)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCamera, setIsCamera] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(false)

  useEffect(() => {
    setPreview(photo)
  }, [photo])

  const startCamera = async () => {
    // Native Capacitor Mobile Fast Path
    if (isNativePlatform()) {
      try {
        const rawNativeBase64 = await captureNativePhoto()
        if (rawNativeBase64) {
          setIsCompressing(true)
          const compressedData = await compressImageBase64(rawNativeBase64, 1920, 0.85)
          setPreview(compressedData)
          setIsCompressing(false)

          const cloudUrl = await uploadToCloud(compressedData)
          if (cloudUrl) {
            setPreview(cloudUrl)
            onCapture(photoType, cloudUrl)
          } else {
            onCapture(photoType, compressedData)
          }
          return
        }
      } catch (nativeErr) {
        console.warn("[PhotoUpload] Native camera capture failed:", nativeErr)
      }
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

  /** Upload compressed base64 to cloud storage, return the URL */
  const uploadToCloud = async (base64: string): Promise<string | null> => {
    try {
      setIsUploading(true)
      setUploadError(false)
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64,
          filename: `inspection-${photoType}-${Date.now()}.jpg`,
        }),
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      return data.data?.url ?? null
    } catch (err) {
      console.error("[PhotoUpload] Cloud upload failed:", err)
      setUploadError(true)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        setIsCompressing(true)
        // Use actual video stream resolution instead of hardcoded canvas size
        const video = videoRef.current
        const captureWidth = video.videoWidth || 1920
        const captureHeight = video.videoHeight || 1080
        canvasRef.current.width = captureWidth
        canvasRef.current.height = captureHeight
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"
        context.drawImage(video, 0, 0, captureWidth, captureHeight)
        const rawData = canvasRef.current.toDataURL("image/jpeg", 0.95)

        // Compress photo to 1920px max resolution and 85% quality JPEG
        const compressedData = await compressImageBase64(rawData, 1920, 0.85)

        // Show preview immediately using base64
        setPreview(compressedData)
        setIsCompressing(false)
        stopCamera()

        // Upload to cloud storage — store only the URL
        const cloudUrl = await uploadToCloud(compressedData)
        if (cloudUrl) {
          setPreview(cloudUrl)
          onCapture(photoType, cloudUrl)
        } else {
          // Fallback: keep base64 so user doesn't lose the photo
          onCapture(photoType, compressedData)
        }
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

  const removePhoto = () => {
    setPreview(null)
    setUploadError(false)
    onCapture(photoType, null)
  }

  /** Retry upload if it failed */
  const retryUpload = async () => {
    if (!preview || isCloudUrl(preview)) return
    const cloudUrl = await uploadToCloud(preview)
    if (cloudUrl) {
      setPreview(cloudUrl)
      onCapture(photoType, cloudUrl)
    }
  }

  /** Check if a string is a cloud URL (not base64) */
  const isCloudUrl = (s: string) => s.startsWith("http")

  /** Base64 photos have a weight; cloud URLs don't */
  const photoWeight = preview && !isCloudUrl(preview) ? formatFileSize(getBase64ByteSize(preview)) : null
  const isStoredInCloud = preview ? isCloudUrl(preview) : false

  return (
    <Card className="p-3 sm:p-4 shadow-xs border-border">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <label className="block text-xs sm:text-sm font-medium truncate">{label}</label>
        {photoWeight && (
          <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded px-1.5 py-0.5 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            {photoWeight}
          </span>
        )}
      </div>

      {isCompressing ? (
        <div className="h-36 sm:h-48 flex flex-col items-center justify-center bg-muted/40 rounded-lg gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground animate-pulse">Mengompresi foto...</p>
        </div>
      ) : preview ? (
        <div className="relative bg-black/5 dark:bg-white/5 rounded-lg p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="w-full h-36 sm:h-48 object-contain rounded-md" />

          {/* Cloud status indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            {isUploading ? (
              <span className="text-[10px] text-blue-700 bg-blue-50/90 border border-blue-200 rounded px-1.5 py-0.5 flex items-center gap-1 font-mono backdrop-blur-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                Mengunggah...
              </span>
            ) : isStoredInCloud ? (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5 flex items-center gap-1 font-mono backdrop-blur-xs">
                <CloudUpload className="w-3 h-3" />
                Cloud
              </span>
            ) : uploadError ? (
              <button
                type="button"
                onClick={retryUpload}
                className="text-[10px] text-orange-700 bg-orange-50/90 border border-orange-200 rounded px-1.5 py-0.5 flex items-center gap-1 font-mono backdrop-blur-xs cursor-pointer hover:bg-orange-100"
                title="Gagal mengunggah ke cloud, klik untuk coba lagi"
              >
                <CloudOff className="w-3 h-3" />
                Gagal — Coba Lagi
              </button>
            ) : null}
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={removePhoto}
            className="absolute top-2 right-2 h-7 w-7 p-0 shadow-md"
            title="Hapus Foto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : isCamera ? (
        <div className="space-y-2">
          <video ref={videoRef} autoPlay playsInline className="w-full h-36 sm:h-48 bg-black rounded-lg object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2">
            <Button type="button" onClick={capturePhoto} variant="default" className="flex-1 text-xs sm:text-sm h-10">
              <Camera className="w-4 h-4 mr-1.5" />
              Ambil Foto
            </Button>
            <Button type="button" onClick={stopCamera} variant="outline" className="flex-1 text-xs sm:text-sm h-10 bg-transparent">
              Batalkan
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-6 text-center bg-muted/20">
            <Camera className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-muted-foreground mb-1.5" />
            <p className="text-xs sm:text-sm text-muted-foreground">Ambil foto bukti langsung via kamera</p>
          </div>
          <Button type="button" onClick={startCamera} variant="default" className="w-full text-xs sm:text-sm h-10">
            <Camera className="w-4 h-4 mr-1.5" />
            Buka Kamera
          </Button>
        </div>
      )}
    </Card>
  )
}

