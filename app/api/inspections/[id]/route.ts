import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { notifyUser, notifyAdmins, getUserIdByName } from "@/lib/notification-helpers"
import { apiError } from "@/lib/api-response"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idString } = await params

        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const id = parseInt(idString)
        const inspection = await db.inspection.findUnique({
            where: { id },
        })

        if (!inspection) {
            return apiError("Inspection not found", 404)
        }

        return NextResponse.json(inspection)
    } catch (error) {
        console.error("[INSPECTION_GET]", error)
        return apiError("Internal Error", 500)
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idString } = await params

        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const id = parseInt(idString)
        const body = await req.json()

        const currentInspection = await db.inspection.findUnique({
            where: { id },
            select: { status: true, createdBy: true, shipperName: true }
        })

        if (!currentInspection) {
            return apiError("Inspection not found", 404)
        }

        const isAdmin = session.role === "admin"

        if (!isAdmin) {
            // Non-admin (User / Verificator) can ONLY update their own inspection if status is 'needs_correction'
            if (currentInspection.createdBy !== session.name) {
                return apiError("Forbidden: Anda tidak memiliki akses ke inspeksi ini", 403)
            }

            if (currentInspection.status !== "needs_correction") {
                return apiError("Inspeksi hanya dapat diperbarui jika berstatus Perlu Perbaikan", 403)
            }

            // Update inspection data and reset status back to 'pending' for admin re-verification
            const updatePayload: Record<string, any> = {
                status: "pending", // Resubmit to pending
            }

            if (body.shipperName) updatePayload.shipperName = body.shipperName
            if (body.commodityType) updatePayload.commodityType = body.commodityType
            if (body.containerNumber !== undefined) updatePayload.containerNumber = body.containerNumber
            if (body.notes !== undefined) updatePayload.notes = body.notes
            if (body.stackingDescription !== undefined) updatePayload.stackingDescription = body.stackingDescription
            if (body.slicingDescription !== undefined) updatePayload.moistureDescription = body.slicingDescription
            if (body.photos) updatePayload.photos = body.photos
            if (body.location) updatePayload.location = body.location

            const updatedInspection = await db.inspection.update({
                where: { id },
                data: updatePayload,
            })

            // Notify admins about resubmission
            await notifyAdmins(
                "inspection_submitted",
                "Pengajuan Perbaikan",
                `Inspeksi perbaikan dari ${currentInspection.createdBy} untuk ${body.shipperName || currentInspection.shipperName} telah dikirim ulang`,
                id
            )

            return NextResponse.json(updatedInspection)
        }

        // ADMIN FLOW: Update status & admin notes
        const updateData: { status?: string; adminNotes?: string } = {}
        if (body.status) updateData.status = body.status
        if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes

        const inspection = await db.inspection.update({
            where: { id },
            data: updateData,
        })

        // Notify creator about status change
        const newStatus = body.status
        if (newStatus && newStatus !== currentInspection.status) {
            const verificatorId = await getUserIdByName(currentInspection.createdBy)

            if (verificatorId) {
                if (newStatus === "approved") {
                    await notifyUser(
                        verificatorId,
                        "inspection_approved",
                        "Inspeksi Disetujui (Benar)",
                        `Inspeksi Anda untuk ${currentInspection.shipperName} telah diverifikasi dan disetujui (Benar)`,
                        id
                    )
                } else if (newStatus === "needs_correction") {
                    await notifyUser(
                        verificatorId,
                        "correction_requested",
                        "Perbaikan Diperlukan",
                        `Admin meminta perbaikan untuk inspeksi ${currentInspection.shipperName}: ${body.adminNotes || "Silakan periksa foto/data"}`,
                        id
                    )
                }
            }
        }

        return NextResponse.json(inspection)
    } catch (error) {
        console.error("[INSPECTION_UPDATE]", error)
        return apiError("Internal Error", 500)
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idString } = await params

        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        // Only admins can delete inspections
        if (session.role !== "admin") {
            return apiError("Forbidden", 403)
        }

        const id = parseInt(idString)
        await db.inspection.delete({
            where: { id },
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[INSPECTION_DELETE]", error)
        return apiError("Internal Error", 500)
    }
}
