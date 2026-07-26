"use client"

import { useEffect, useState } from "react"

const TILE_SIZE = 256
const WATER_COLOR = "#aad3df" // OSM base water color
const ATTRIBUTION = "© OpenStreetMap contributors"

interface StaticMapProps {
    lat: number
    lng: number
    zoom?: number
    /** Canvas pixel width (rendered at 2x for crisp PDF/retina output) */
    width?: number
    /** Canvas pixel height */
    height?: number
    className?: string
    alt?: string
}

/** Convert lat/lng to global pixel coordinates at a zoom level (Web Mercator) */
function latLngToPixels(lat: number, lng: number, zoom: number) {
    const n = Math.pow(2, zoom)
    const latRad = (lat * Math.PI) / 180
    return {
        x: ((lng + 180) / 360) * n * TILE_SIZE,
        y:
            ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
            n *
            TILE_SIZE,
    }
}

function loadTile(zoom: number, x: number, y: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`tile ${zoom}/${x}/${y} failed`))
        img.src = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
    })
}

/** Draw a map pin with its tip anchored at (cx, cy). scale=1 suits a 400px-wide map. */
function drawPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
    const r = 11 * scale
    const headCy = cy - r - 9 * scale

    ctx.save()
    // soft shadow under the tip
    ctx.beginPath()
    ctx.ellipse(cx, cy + 2 * scale, 7 * scale, 2.5 * scale, 0, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(0,0,0,0.3)"
    ctx.fill()

    // tail
    ctx.beginPath()
    ctx.moveTo(cx - 6 * scale, headCy + r * 0.7)
    ctx.lineTo(cx + 6 * scale, headCy + r * 0.7)
    ctx.lineTo(cx, cy)
    ctx.closePath()
    ctx.fillStyle = "#dc2626"
    ctx.fill()

    // head
    ctx.beginPath()
    ctx.arc(cx, headCy, r, 0, Math.PI * 2)
    ctx.fillStyle = "#dc2626"
    ctx.fill()
    ctx.lineWidth = 2 * scale
    ctx.strokeStyle = "#ffffff"
    ctx.stroke()

    // inner dot
    ctx.beginPath()
    ctx.arc(cx, headCy, r * 0.38, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.restore()
}

function drawAttribution(ctx: CanvasRenderingContext2D, width: number, height: number, scale: number) {
    ctx.save()
    ctx.font = `${10 * scale}px sans-serif`
    const textWidth = ctx.measureText(ATTRIBUTION).width
    const padX = 4 * scale
    const boxH = 14 * scale
    ctx.fillStyle = "rgba(255,255,255,0.75)"
    ctx.fillRect(width - textWidth - padX * 2, height - boxH, textWidth + padX * 2, boxH)
    ctx.fillStyle = "#222222"
    ctx.textBaseline = "middle"
    ctx.fillText(ATTRIBUTION, width - textWidth - padX, height - boxH / 2)
    ctx.restore()
}

/**
 * Renders a static map as a single <img> whose src is a client-side composited
 * data URL built from OpenStreetMap tiles. No API key required, CORS-safe for
 * html2canvas/PDF export, and prints reliably (single image, no network needed).
 */
export function StaticMap({
    lat,
    lng,
    zoom = 15,
    width = 800,
    height = 600,
    className,
    alt = "Location Map",
}: StaticMapProps) {
    const [src, setSrc] = useState<string | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function buildMap() {
            try {
                const center = latLngToPixels(lat, lng, zoom)
                const originX = center.x - width / 2
                const originY = center.y - height / 2

                const tileMinX = Math.floor(originX / TILE_SIZE)
                const tileMaxX = Math.floor((originX + width - 1) / TILE_SIZE)
                const tileMinY = Math.floor(originY / TILE_SIZE)
                const tileMaxY = Math.floor((originY + height - 1) / TILE_SIZE)
                const maxTile = Math.pow(2, zoom)

                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d")
                if (!ctx) throw new Error("canvas 2d context unavailable")

                ctx.fillStyle = WATER_COLOR
                ctx.fillRect(0, 0, width, height)

                const jobs: Promise<void>[] = []
                for (let tx = tileMinX; tx <= tileMaxX; tx++) {
                    for (let ty = tileMinY; ty <= tileMaxY; ty++) {
                        if (ty < 0 || ty >= maxTile) continue
                        // Longitude wraps around the antimeridian
                        const wrappedX = ((tx % maxTile) + maxTile) % maxTile
                        const dx = tx * TILE_SIZE - originX
                        const dy = ty * TILE_SIZE - originY
                        jobs.push(
                            loadTile(zoom, wrappedX, ty)
                                .then((img) => ctx.drawImage(img, dx, dy))
                                .catch(() => {
                                    /* leave water background for failed tiles */
                                })
                        )
                    }
                }
                await Promise.all(jobs)
                if (cancelled) return

                const scale = width / 400
                drawPin(ctx, width / 2, height / 2, scale)
                drawAttribution(ctx, width, height, scale)

                setSrc(canvas.toDataURL("image/png"))
            } catch (error) {
                console.error("[StaticMap] Failed to build map:", error)
                if (!cancelled) setFailed(true)
            }
        }

        buildMap()
        return () => {
            cancelled = true
        }
    }, [lat, lng, zoom, width, height])

    if (failed) {
        return (
            <div
                className={className}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <span style={{ fontSize: 11, color: "#6b7280", fontStyle: "italic" }}>
                    Peta tidak tersedia ({lat.toFixed(6)}, {lng.toFixed(6)})
                </span>
            </div>
        )
    }

    if (!src) {
        return (
            <div
                className={className}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
                <span style={{ fontSize: 11, color: "#6b7280" }}>Memuat peta...</span>
            </div>
        )
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} draggable={false} />
}
