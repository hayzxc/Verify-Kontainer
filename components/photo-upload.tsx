"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Camera, CheckCircle2 } from "lucide-react"
import { compressImageBase64, getBase64ByteSize, formatFileSize } from "@/lib/image-compression"

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

  useEffect(() => {
    setPreview(photo)
  }, [photo])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
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
        context.drawImage(videoRef.current, 0, 0)
        const rawData = canvasRef.current.toDataURL("image/jpeg", 0.9)
        
        // Compress photo to 1280px max resolution and 75% quality JPEG
        const compressedData = await compressImageBase64(rawData, 1280, 0.75)
        setPreview(compressedData)
        onCapture(photoType, compressedData)
        setIsCompressing(false)
        stopCamera()
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
    onCapture(photoType, null)
  }

  const photoWeight = preview ? formatFileSize(getBase64ByteSize(preview)) : null

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
        <div className="h-36 sm:h-48 flex items-center justify-center bg-muted/40 rounded-lg">
          <p className="text-xs text-muted-foreground animate-pulse">Mengompresi foto...</p>
        </div>
      ) : preview ? (
        <div className="relative bg-black/5 dark:bg-white/5 rounded-lg p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="w-full h-36 sm:h-48 object-contain rounded-md" />
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
          <canvas ref={canvasRef} className="hidden" width="1280" height="960" />
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

