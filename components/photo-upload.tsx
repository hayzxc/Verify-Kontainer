"use client"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Camera } from "lucide-react"

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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      setIsCamera(true)
      // Wait for state update and ref to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Tidak dapat mengakses kamera")
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        context.drawImage(videoRef.current, 0, 0)
        const imageData = canvasRef.current.toDataURL("image/jpeg")
        setPreview(imageData)
        onCapture(photoType, imageData)
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

  return (
    <Card className="p-3 sm:p-4 shadow-xs border-border">
      <label className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 truncate">{label}</label>

      {preview ? (
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
          <canvas ref={canvasRef} className="hidden" width="640" height="480" />
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
            <p className="text-xs sm:text-sm text-muted-foreground">Ambil foto bukti langsung</p>
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
