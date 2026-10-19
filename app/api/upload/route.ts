import { NextRequest } from "next/server"
import { UTApi } from "uploadthing/server"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"

const utapi = new UTApi()

export async function POST(req: NextRequest) {
    try {
        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const body = await req.json()
        const { base64, filename } = body as { base64: string; filename?: string }

        if (!base64) {
            return apiError("Missing base64 image data", 400)
        }

        // Extract MIME type and raw base64 payload
        const matches = base64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
        if (!matches) {
            return apiError("Invalid base64 image format", 400)
        }

        const mimeType = matches[1]
        const rawBase64 = matches[2]

        // Convert base64 to Blob → File for UploadThing
        const byteCharacters = atob(rawBase64)
        const byteArray = new Uint8Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i)
        }

        const blob = new Blob([byteArray.buffer], { type: mimeType })
        const fileExt = mimeType === "image/png" ? "png" : "jpg"
        const fileName = filename || `inspection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
        const file = new File([blob], fileName, { type: mimeType })

        // Upload to UploadThing cloud storage
        const result = await utapi.uploadFiles(file)
        const resItem = Array.isArray(result) ? result[0] : result

        if (resItem?.error) {
            console.error("[UPLOAD] UploadThing error:", resItem.error)
            return apiError(resItem.error.message || "Failed to upload image to cloud storage", 500)
        }

        // Return the cloud URL (UploadThing v7+ uses ufsUrl, legacy uses url)
        const url = resItem?.data?.ufsUrl || resItem?.data?.url
        if (!url) {
            return apiError("Upload succeeded but no URL returned", 500)
        }

        return apiSuccess({ url, key: resItem?.data?.key })
    } catch (error) {
        console.error("[UPLOAD]", error)
        return apiError("Internal upload error", 500)
    }
}
