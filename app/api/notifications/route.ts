import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

export async function GET() {
    try {
        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }

        const userId = session.id as string

        const [notifications, unreadCount] = await db.$transaction([
            db.notification.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                    inspection: {
                        select: {
                            id: true,
                            shipperName: true,
                            status: true,
                        },
                    },
                },
            }),
            db.notification.count({
                where: { userId, read: false },
            }),
        ])

        // Non-blocking background auto-cleanup of read notifications older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        db.notification
            .deleteMany({
                where: {
                    userId,
                    read: true,
                    createdAt: { lt: thirtyDaysAgo },
                },
            })
            .catch((err) => console.error("[NOTIFICATIONS_CLEANUP]", err))

        return NextResponse.json({
            notifications,
            unreadCount,
        })
    } catch (error) {
        console.error("[NOTIFICATIONS_GET]", error)
        return apiError("Internal Error", 500)
    }
}
