export interface LocationData {
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

/** Photo value: single URL string (legacy), array of URLs (multi), or null */
export type PhotoValue = string | string[] | null

export interface InspectionPhotos {
    shipper: PhotoValue
    containerNumber: PhotoValue
    commodity: PhotoValue
    ispm: PhotoValue
    stacking: PhotoValue
    slicing: PhotoValue
    /** Extra evidence photos that don't fit the standard categories */
    additionalPhotos?: string[]
    [key: string]: PhotoValue | string[] | undefined
}

/**
 * Normalize a PhotoValue into a flat array of non-empty URL strings.
 * Handles legacy single-string values, arrays, null, and undefined.
 */
export function normalizePhotos(value: PhotoValue | undefined): string[] {
    if (!value) return []
    if (Array.isArray(value)) return value.filter(Boolean)
    return [value]
}

export interface InspectionData {
    shipperName: string
    commodityType: string
    containerNumber: string
    inspectionLocationType?: "depo" | "pabrik" | ""
    inspectionLocationName?: string
    verificationStage?: "awal" | "akhir" | string
    notes: string
    location: LocationData | null
    photos: InspectionPhotos
    stackingDescription: string
    slicingDescription: string
    createdAt?: string
    timestamp?: string
    date?: string
    time?: string
}

export interface Inspection extends InspectionData {
    id: number
    createdBy: string
    createdAt: string
    status: "pending" | "approved" | "needs_correction"
    adminNotes?: string
    /** DB column name — the form uses slicingDescription but the API returns this field */
    moistureDescription?: string
}

export interface BulkInspectionData {
    shipperName: string
    commodityType: string
    inspectionLocationType?: "depo" | "pabrik" | ""
    inspectionLocationName?: string
    verificationStage?: "awal" | "akhir" | string
    containerNumbers: string[]
    notes: string
    location: LocationData | null
    photos: Partial<InspectionPhotos>
    stackingDescription: string
    slicingDescription: string
    createdAt?: string
}
