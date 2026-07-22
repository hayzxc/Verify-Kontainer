"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, MapPin, RefreshCw } from "lucide-react"

interface LocationData {
  latitude: number
  longitude: number
  timestamp: string
  mapsLink: string
  address?: {
    name?: string
    street?: string
    city?: string
    province?: string
    postalCode?: string
    formatted?: string
  }
}

interface LocationTrackerProps {
  onLocationUpdate: (location: LocationData) => void
  location: LocationData | null
}

export function LocationTracker({ onLocationUpdate, location }: LocationTrackerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [manualMode, setManualMode] = useState(false)
  const [manualLat, setManualLat] = useState("")
  const [manualLng, setManualLng] = useState("")

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "ContainerInspectionApp/1.0",
          },
        }
      )
      const data = await response.json()
      if (data && data.address) {
        return {
          name: data.name || data.display_name.split(",")[0],
          street: data.address.road || data.address.pedestrian,
          city: data.address.city || data.address.town || data.address.village || data.address.county,
          province: data.address.state || data.address.region,
          postalCode: data.address.postcode,
          formatted: data.display_name,
        }
      }
    } catch (error) {
      console.error("Error fetching address:", error)
    }
    return undefined
  }

  const getPosition = (options?: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options)
    })
  }

  const getLocation = async () => {
    setIsLoading(true)
    setError("")
    setManualMode(false)

    if (!navigator.geolocation) {
      setError("Geolocation tidak didukung oleh browser Anda")
      setIsLoading(false)
      setManualMode(true)
      return
    }

    try {
      // Fast path: try a cached position first (often succeeds instantly on mobile/Wi‑Fi)
      try {
        const cached = await getPosition({
          enableHighAccuracy: false,
          timeout: 2000,
          maximumAge: 5 * 60 * 1000,
        })
        const { latitude, longitude } = cached.coords
        await updateLocation(latitude, longitude)
        setIsLoading(false)
        return
      } catch {
        // Ignore and continue with fresh attempts
      }

      // Strategy: Try High Accuracy first with short timeout. 
      // If fails (Timeout/Unavailable), fallback to Low Accuracy (Wifi/IP).

      try {
        console.log("Attempting High Accuracy GPS...")
        const position = await getPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        })
        console.log("High Accuracy Success")
        const { latitude, longitude } = position.coords
        await updateLocation(latitude, longitude)
        setIsLoading(false)
        return
      } catch (err: any) {
        // Re-throw permission denied immediately
        if (err.code === 1) throw err;

        console.warn("High Accuracy failed (Code " + err.code + "). Retrying with Low Accuracy...")
      }

      // Fallback: Low Accuracy
      const position = await getPosition({
        enableHighAccuracy: false, // Use Wifi/Cell/IP
        timeout: 30000,
        maximumAge: 60 * 1000,
      })
      console.log("Low Accuracy Success")
      const { latitude, longitude } = position.coords
      await updateLocation(latitude, longitude)
      setIsLoading(false)

    } catch (err: any) {
      console.error("Geolocation error full object:", err)
      console.error("Geolocation error code:", err.code, "message:", err.message)

      let errorMessage = "Gagal mendapatkan lokasi: " + err.message

      if (err.code === 1) { // PERMISSION_DENIED
        errorMessage = "Izin lokasi ditolak. Pastikan Anda mengizinkan akses lokasi."
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          errorMessage += " (PENTING: Geolocation memerlukan HTTPS atau localhost. Anda mengakses via HTTP non-lokal)"
        }
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        errorMessage = "Lokasi tidak tersedia (Position Unavailable). Cek GPS Anda."
      } else if (err.code === 3) { // TIMEOUT
        errorMessage = "Waktu habis (Timeout). Gagal mendapatkan lokasi dari GPS maupun Network. Coba pindah ke area terbuka / nyalakan GPS / nyalakan Wi‑Fi, lalu coba lagi."
      }

      setError(errorMessage)
      setIsLoading(false)
      setManualMode(true) // Enable manual mode on error
    }
  }

  const updateLocation = async (lat: number, lng: number) => {
    const address = await fetchAddress(lat, lng)

    const newLocation: LocationData = {
      latitude: lat,
      longitude: lng,
      timestamp: new Date().toLocaleString("id-ID"),
      mapsLink: `https://maps.google.com/?q=${lat},${lng}`,
      address,
    }
    onLocationUpdate(newLocation)
  }

  const handleManualSubmit = async () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)

    if (isNaN(lat) || isNaN(lng)) {
      setError("Koordinat tidak valid")
      return
    }

    setIsLoading(true)
    await updateLocation(lat, lng)
    setIsLoading(false)
    setError("")
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {!manualMode ? (
          <Button type="button" onClick={getLocation} disabled={isLoading} variant="default" className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengambil Lokasi...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Dapatkan Koordinat GPS
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  placeholder="-6.200000"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  placeholder="106.816666"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleManualSubmit} className="flex-1" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Manual"}
              </Button>
              <Button type="button" variant="outline" onClick={getLocation} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded flex justify-between items-center">
            <span>{error}</span>
            {!manualMode && (
              <Button variant="link" size="sm" onClick={() => setManualMode(true)} className="text-destructive underline h-auto p-0 ml-2">
                Input Manual
              </Button>
            )}
          </div>
        )}

        {location && (
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <div>
              <span className="font-semibold">Koordinat:</span>
              <p className="text-foreground/80">
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
            </div>
            {location.address && (
              <>
                <div>
                  <span className="font-semibold">Alamat:</span>
                  <p className="text-foreground/80">{location.address.name}</p>
                  <p className="text-foreground/80">{location.address.street}</p>
                  <p className="text-foreground/80">
                    {location.address.city}, {location.address.province} {location.address.postalCode}
                  </p>
                </div>
              </>
            )}
            <div>
              <span className="font-semibold">Waktu:</span>
              <p className="text-foreground/80">{location.timestamp}</p>
            </div>
            <a
              href={location.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm block mt-2"
            >
              Buka di Google Maps
            </a>
          </div>
        )}
      </div>
    </Card>
  )
}
