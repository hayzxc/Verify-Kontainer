import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idString } = await params

        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const id = parseInt(idString)
        const userId = session.id as string

        // Ensure user owns this notification
        const notification = await db.notification.findFirst({
            where: { id, userId }
        })

        if (!notification) {
            return apiError("Notification not found", 404)
        }

        const updated = await db.notification.update({
            where: { id },
            data: { read: true }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("[NOTIFICATION_PATCH]", error)
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

        const id = parseInt(idString)
        const userId = session.id as string

        // Ensure user owns this notification
        const notification = await db.notification.findFirst({
            where: { id, userId }
        })

        if (!notification) {
            return apiError("Notification not found", 404)
        }

        await db.notification.delete({
            where: { id }
        })

        return new NextResponse(null, { status: 204 })
    } catch (error) {
        console.error("[NOTIFICATION_DELETE]", error)
        return apiError("Internal Error", 500)
    }
}
