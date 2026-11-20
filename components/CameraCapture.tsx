"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { useCameraStream } from "@/hooks/useCameraStream"

interface CameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

interface CameraOverlayProps {
  onClose: () => void
  onCapture: (file: File) => void
}

const ICON_BUTTON_CLASS =
  "flex items-center justify-center min-w-12 min-h-12 size-12 rounded-full bg-black/40 text-white backdrop-blur-md active:bg-black/60 touch-manipulation focus-visible:outline-hidden cursor-pointer"

function CloseIcon(): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      className="size-6 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SwitchCameraIcon(): React.ReactElement {
  return (
    <svg
      aria-hidden="true"
      className="size-6 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve): void => {
    canvas.toBlob(
      (blob): void => {
        resolve(blob)
      },
      "image/jpeg",
      0.92
    )
  })
}

async function captureFrameAsFile(video: HTMLVideoElement): Promise<File | null> {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  if (videoWidth === 0 || videoHeight === 0) {
    return null
  }

  const canvas = document.createElement("canvas")
  canvas.width = videoWidth
  canvas.height = videoHeight

  const context = canvas.getContext("2d")
  if (context === null) {
    return null
  }

  context.drawImage(video, 0, 0, videoWidth, videoHeight)
  const blob = await canvasToBlob(canvas)
  if (blob === null) {
    return null
  }

  const fileName = `foto-${String(Date.now())}.jpg`
  return new File([blob], fileName, { type: "image/jpeg" })
}

function useOverlayBehavior(
  overlayRef: React.RefObject<HTMLDivElement | null>,
  onClose: () => void
): void {
  const onCloseRef = useRef<() => void>(onClose)

  useEffect((): void => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect((): (() => void) => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onCloseRef.current()
      }
    }

    const handleFullscreenChange = (): void => {
      if (document.fullscreenElement === null) {
        onCloseRef.current()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    const overlayElement = overlayRef.current
    if (overlayElement !== null && "requestFullscreen" in overlayElement) {
      overlayElement.requestFullscreen().catch((): undefined => undefined)
    }

    return (): void => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)

      if (document.fullscreenElement !== null) {
        document.exitFullscreen().catch((): undefined => undefined)
      }
    }
  }, [overlayRef])
}

function CameraOverlay({ onClose, onCapture }: CameraOverlayProps): React.ReactElement | null {
  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false)
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  const { errorMessage, canSwitchCamera, isMirrored } = useCameraStream(facing, videoRef)
  useOverlayBehavior(overlayRef, onClose)

  const handleSwitchFacing = (): void => {
    setIsVideoReady(false)
    setFacing((previousFacing): "environment" | "user" =>
      previousFacing === "environment" ? "user" : "environment"
    )
  }

  const handleCapture = async (): Promise<void> => {
    if (isCapturing || videoRef.current === null) {
      return
    }
    setIsCapturing(true)
    try {
      const file = await captureFrameAsFile(videoRef.current)
      if (file !== null) {
        onCapture(file)
        onClose()
      }
    } finally {
      setIsCapturing(false)
    }
  }

  const handleShutterClick = (): void => {
    void handleCapture()
  }

  if (typeof document === "undefined") {
    return null
  }

  const videoClassName = isMirrored
    ? "absolute inset-0 h-full w-full object-cover -scale-x-100"
    : "absolute inset-0 h-full w-full object-cover"

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] h-[100dvh] w-screen bg-black select-none overflow-hidden"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(): void => {
          setIsVideoReady(true)
        }}
        onCanPlay={(): void => {
          setIsVideoReady(true)
        }}
        className={videoClassName}
      />

      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] z-10 pointer-events-auto">
        <button
          type="button"
          onClick={onClose}
          className={ICON_BUTTON_CLASS}
          aria-label="Tutup kamera"
        >
          <CloseIcon />
        </button>

        {canSwitchCamera && (
          <button
            type="button"
            onClick={handleSwitchFacing}
            className={ICON_BUTTON_CLASS}
            aria-label="Ganti kamera"
          >
            <SwitchCameraIcon />
          </button>
        )}
      </div>

      {errorMessage !== null && (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center rounded-2xl bg-zinc-900/95 p-6 text-center text-white shadow-2xl backdrop-blur-md border border-zinc-800 max-w-md mx-auto">
          <p className="text-sm font-medium leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-center p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={handleShutterClick}
            disabled={errorMessage !== null || isVideoReady === false || isCapturing === true}
            className="relative flex items-center justify-center size-[76px] rounded-full border-4 border-white bg-transparent p-1 shadow-lg transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none touch-manipulation focus-visible:outline-hidden cursor-pointer"
            aria-label="Ambil foto"
          >
            <span className="size-full rounded-full bg-white transition-all active:bg-zinc-200" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function CameraCapture({
  isOpen,
  onClose,
  onCapture,
}: CameraCaptureProps): React.ReactElement | null {
  if (isOpen === false) {
    return null
  }
  return <CameraOverlay onClose={onClose} onCapture={onCapture} />
}
