import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { notifyUser, notifyAdmins, getUserIdByName } from "@/lib/notification-helpers"
import { apiError } from "@/lib/api-response"
import { AdminReviewPatchSchema, InspectionResubmitSchema } from "@/lib/validations"

function parseInspectionId(idString: string): number | null {
    const id = Number(idString)
    return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idString } = await params

        const session = await verifySession(req)
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const id = parseInspectionId(idString)
        if (!id) {
            return apiError("Invalid inspection ID", 400)
        }

        const inspection = await db.inspection.findUnique({
            where: { id },
        })

        if (!inspection) {
            return apiError("Inspection not found", 404)
        }

        if (session.role !== "admin" && inspection.createdBy !== session.name) {
            return apiError("Forbidden: Anda tidak memiliki akses ke inspeksi ini", 403)
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

        const session = await verifySession(req)
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const id = parseInspectionId(idString)
        if (!id) {
            return apiError("Invalid inspection ID", 400)
        }

        const body: unknown = await req.json()

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

            const parsed = InspectionResubmitSchema.safeParse(body)
            if (!parsed.success) {
                return apiError(parsed.error.errors[0].message, 400)
            }

            const data = parsed.data
            const updatePayload: Prisma.InspectionUpdateInput = {
                status: "pending",
            }

            if (data.shipperName) updatePayload.shipperName = data.shipperName
            if (data.commodityType) updatePayload.commodityType = data.commodityType
            if (data.containerNumber !== undefined) updatePayload.containerNumber = data.containerNumber
            if (data.inspectionLocationType !== undefined) updatePayload.inspectionLocationType = data.inspectionLocationType
            if (data.inspectionLocationName !== undefined) updatePayload.inspectionLocationName = data.inspectionLocationName
            if (data.verificationStage !== undefined) updatePayload.verificationStage = data.verificationStage
            if (data.notes !== undefined) updatePayload.notes = data.notes
            if (data.stackingDescription !== undefined) updatePayload.stackingDescription = data.stackingDescription
            if (data.slicingDescription !== undefined) updatePayload.moistureDescription = data.slicingDescription
            if (data.photos !== undefined) updatePayload.photos = data.photos as Prisma.InputJsonValue
            if (data.location !== undefined) {
                updatePayload.location = data.location === null
                    ? Prisma.JsonNull
                    : (data.location as Prisma.InputJsonValue)
            }
            if (data.createdAt && session.role === "verificator") {
                const parsedDate = new Date(data.createdAt)
                if (!Number.isNaN(parsedDate.getTime())) {
                    updatePayload.createdAt = parsedDate
                }
            }

            const updatedInspection = await db.inspection.update({
                where: { id },
                data: updatePayload,
            })

            await notifyAdmins(
                "inspection_submitted",
                "Pengajuan Perbaikan",
                `Inspeksi perbaikan dari ${currentInspection.createdBy} untuk ${data.shipperName || currentInspection.shipperName} telah dikirim ulang`,
                id
            )

            return NextResponse.json(updatedInspection)
        }

        const parsedAdmin = AdminReviewPatchSchema.safeParse(body)
        if (!parsedAdmin.success) {
            return apiError(parsedAdmin.error.errors[0].message, 400)
        }

        const adminData = parsedAdmin.data
        const updateData: Prisma.InspectionUpdateInput = {}
        if (adminData.status) updateData.status = adminData.status
        if (adminData.adminNotes !== undefined) updateData.adminNotes = adminData.adminNotes

        const inspection = await db.inspection.update({
            where: { id },
            data: updateData,
        })

        // Notify creator about status change
        const newStatus = adminData.status
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
                        `Admin meminta perbaikan untuk inspeksi ${currentInspection.shipperName}: ${adminData.adminNotes || "Silakan periksa foto/data"}`,
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

        const session = await verifySession(req)
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        // Only admins can delete inspections
        if (session.role !== "admin") {
            return apiError("Forbidden", 403)
        }

        const id = parseInspectionId(idString)
        if (!id) {
            return apiError("Invalid inspection ID", 400)
        }

        await db.inspection.delete({
            where: { id },
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[INSPECTION_DELETE]", error)
        return apiError("Internal Error", 500)
    }
}
