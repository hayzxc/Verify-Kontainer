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

export interface InspectionPhotos {
    shipper: string | null
    containerNumber: string | null
    commodity: string | null
    ispm: string | null
    stacking: string | null
    slicing: string | null
    [key: string]: string | null
}

export interface InspectionData {
    shipperName: string
    commodityType: string
    containerNumber: string
    notes: string
    location: LocationData | null
    photos: InspectionPhotos
    stackingDescription: string
    slicingDescription: string
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
    containerNumbers: string[]
    notes: string
    location: LocationData | null
    photos: Partial<InspectionPhotos>
    stackingDescription: string
    slicingDescription: string
}
