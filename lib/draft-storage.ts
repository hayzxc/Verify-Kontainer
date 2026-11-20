import type { InspectionData, BulkInspectionData } from "@/types/inspection"

export interface InspectionDraftState {
  formData: InspectionData
  customDateTime?: string
  updatedAt: string
}

export interface BulkInspectionDraftState {
  formData: Omit<BulkInspectionData, "containerNumbers"> & { containerNumbersText: string }
  customDateTime?: string
  updatedAt: string
}

const STORAGE_PREFIX = "inspection_draft"

export function getInspectionDraftKey(userId?: string, inspectionId?: string | number): string {
  if (inspectionId) {
    return `${STORAGE_PREFIX}_edit_${inspectionId}`
  }
  return `${STORAGE_PREFIX}_single_${userId || "anonymous"}`
}

export function getBulkInspectionDraftKey(userId?: string): string {
  return `${STORAGE_PREFIX}_bulk_${userId || "anonymous"}`
}

export function saveInspectionDraft(key: string, data: InspectionDraftState): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (err) {
    console.warn("[DraftStorage] Failed to save draft to localStorage:", err)
    return false
  }
}

export function loadInspectionDraft(key: string): InspectionDraftState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as InspectionDraftState
    if (parsed && typeof parsed === "object" && parsed.formData) {
      return parsed
    }
    return null
  } catch (err) {
    console.warn("[DraftStorage] Failed to read draft from localStorage:", err)
    return null
  }
}

export function saveBulkInspectionDraft(key: string, data: BulkInspectionDraftState): boolean {
  if (typeof window === "undefined") return false
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (err) {
    console.warn("[DraftStorage] Failed to save bulk draft to localStorage:", err)
    return false
  }
}

export function loadBulkInspectionDraft(key: string): BulkInspectionDraftState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BulkInspectionDraftState
    if (parsed && typeof parsed === "object" && parsed.formData) {
      return parsed
    }
    return null
  } catch (err) {
    console.warn("[DraftStorage] Failed to read bulk draft from localStorage:", err)
    return null
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.warn("[DraftStorage] Failed to clear draft from localStorage:", err)
  }
}

export function hasMeaningfulInspectionData(data: InspectionData | null | undefined): boolean {
  if (!data) return false
  if (data.shipperName?.trim()) return true
  if (data.containerNumber?.trim()) return true
  if (data.commodityType?.trim()) return true
  if (data.inspectionLocationName?.trim()) return true
  if (data.notes?.trim()) return true
  if (data.location?.latitude || data.location?.longitude) return true
  if (data.stackingDescription?.trim() || data.slicingDescription?.trim()) return true

  // Check photos
  if (data.photos) {
    for (const val of Object.values(data.photos)) {
      if (val) {
        if (Array.isArray(val) && val.length > 0) return true
        if (typeof val === "string" && val.trim().length > 0) return true
      }
    }
  }

  return false
}

export function hasMeaningfulBulkData(
  data: (Omit<BulkInspectionData, "containerNumbers"> & { containerNumbersText: string }) | null | undefined
): boolean {
  if (!data) return false
  if (data.shipperName?.trim()) return true
  if (data.commodityType?.trim()) return true
  if (data.containerNumbersText?.trim()) return true
  if (data.inspectionLocationName?.trim()) return true
  if (data.notes?.trim()) return true
  if (data.location?.latitude || data.location?.longitude) return true
  if (data.stackingDescription?.trim() || data.slicingDescription?.trim()) return true

  if (data.photos) {
    for (const val of Object.values(data.photos)) {
      if (val) {
        if (Array.isArray(val) && val.length > 0) return true
        if (typeof val === "string" && val.trim().length > 0) return true
      }
    }
  }

  return false
}
