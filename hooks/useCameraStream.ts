import type React from "react"
import { useState, useEffect } from "react"

interface UseCameraStreamResult {
  errorMessage: string | null
  canSwitchCamera: boolean
  isMirrored: boolean
}

export function useCameraStream(
  facing: "environment" | "user",
  videoRef: React.RefObject<HTMLVideoElement | null>
): UseCameraStreamResult {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [canSwitchCamera, setCanSwitchCamera] = useState<boolean>(false)
  const [isMirrored, setIsMirrored] = useState<boolean>(false)

  useEffect((): (() => void) => {
    let isCancelled = false
    const hasBeenCancelled = (): boolean => isCancelled
    let activeStream: MediaStream | null = null
    const videoElement = videoRef.current

    const startStream = async (): Promise<void> => {
      if (
        typeof window === "undefined" ||
        window.isSecureContext === false ||
        !("mediaDevices" in navigator)
      ) {
        setErrorMessage("Kamera membutuhkan halaman aman (https) dan browser yang didukung.")
        return
      }

      setErrorMessage(null)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })

        if (hasBeenCancelled()) {
          stream.getTracks().forEach((track): void => {
            track.stop()
          })
          return
        }

        activeStream = stream

        if (videoRef.current !== null) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch((): undefined => undefined)
        }

        const videoTrack = stream.getVideoTracks().at(0)
        const trackFacingMode = videoTrack?.getSettings().facingMode
        const isEnvironment =
          trackFacingMode === "environment" ||
          (trackFacingMode === undefined && facing === "environment")
        setIsMirrored(!isEnvironment)

        if ("enumerateDevices" in navigator.mediaDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices()
          if (!hasBeenCancelled()) {
            const videoInputs = devices.filter(
              (device): boolean => device.kind === "videoinput"
            )
            setCanSwitchCamera(videoInputs.length > 1)
          }
        }
      } catch (error: unknown) {
        if (hasBeenCancelled()) {
          return
        }

        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError" || error.name === "SecurityError") {
            setErrorMessage(
              "Akses kamera diblokir. Izinkan kamera di pengaturan browser, lalu coba lagi."
            )
            return
          }
          if (error.name === "NotFoundError") {
            setErrorMessage("Kamera tidak ditemukan di perangkat ini.")
            return
          }
          if (error.name === "NotReadableError") {
            setErrorMessage(
              "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi."
            )
            return
          }
        }

        setErrorMessage("Kamera tidak bisa dibuka. Silakan coba lagi.")
      }
    }

    void startStream()

    return (): void => {
      isCancelled = true
      if (activeStream !== null) {
        activeStream.getTracks().forEach((track): void => {
          track.stop()
        })
      }
      if (videoElement !== null) {
        videoElement.srcObject = null
      }
    }
  }, [facing, videoRef])

  return {
    errorMessage,
    canSwitchCamera,
    isMirrored,
  }
}
