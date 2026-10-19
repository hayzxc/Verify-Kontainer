import { NextRequest } from "next/server"
import { UTApi } from "uploadthing/server"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"

const utapi = new UTApi()

export async function POST(req: NextRequest) {
    try {
        const session = await verifySession(req)
        if (!session) {
            console.warn("[UPLOAD] Rejected: Unauthorized session")
            return apiError("Unauthorized", 401)
        }

        const body = await req.json().catch((err) => {
            console.error("[UPLOAD] JSON parse error:", err)
            return null
        })

        if (!body) {
            return apiError("Invalid JSON body", 400)
        }

        const { base64, filename } = body as { base64: string; filename?: string }

        if (!base64 || typeof base64 !== "string") {
            return apiError("Missing or invalid base64 image data", 400)
        }

        let mimeType = "image/jpeg"
        let rawBase64 = base64

        // Safe header parsing without catastrophic regex backtracking
        if (base64.startsWith("data:")) {
            const commaIndex = base64.indexOf(",")
            if (commaIndex !== -1) {
                const header = base64.substring(5, commaIndex) // e.g. "image/jpeg;base64"
                const headerMime = header.split(";")[0]?.trim()
                if (headerMime) {
                    mimeType = headerMime
                }
                rawBase64 = base64.substring(commaIndex + 1)
            }
        }

        // Clean any whitespace or newlines from base64 string
        rawBase64 = rawBase64.replace(/\s+/g, "")

        // Convert base64 to Buffer → File for UploadThing
        let buffer: Buffer
        try {
            buffer = Buffer.from(rawBase64, "base64")
        } catch (bufErr) {
            console.error("[UPLOAD] Base64 buffer decoding failed:", bufErr)
            return apiError("Failed to decode base64 image", 400)
        }

        if (buffer.length === 0) {
            return apiError("Image data is empty", 400)
        }

        const extMap: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "image/heic": "heic",
        }
        const fileExt = extMap[mimeType.toLowerCase()] || "jpg"
        const fileName = filename || `inspection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
        const file = new File([buffer as any], fileName, { type: mimeType })

        console.log(`[UPLOAD] Uploading file ${fileName} (${(buffer.length / 1024).toFixed(1)} KB) for user ${session.email}...`)
        const result = await utapi.uploadFiles(file)
        const resItem = Array.isArray(result) ? result[0] : result

        if (resItem?.error) {
            console.error("[UPLOAD] UploadThing error:", resItem.error)
            return apiError(resItem.error.message || "Failed to upload image to cloud storage", 500)
        }

        // Return the cloud URL (UploadThing v7+ uses ufsUrl, legacy uses url)
        const url = resItem?.data?.ufsUrl || resItem?.data?.url
        if (!url) {
            console.error("[UPLOAD] Upload succeeded but no URL returned:", resItem)
            return apiError("Upload succeeded but no URL returned", 500)
        }

        console.log(`[UPLOAD] Upload succeeded: ${url}`)
        return apiSuccess({ url, key: resItem?.data?.key })
    } catch (error: any) {
        console.error("[UPLOAD] Unexpected error:", error)
        return apiError(error?.message || "Internal upload error", 500)
    }
}
