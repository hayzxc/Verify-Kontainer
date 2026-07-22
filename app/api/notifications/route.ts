import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"

export async function GET() {
    try {
        const session = await verifySession()
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = session.id as string

        const notifications = await db.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                inspection: {
                    select: {
                        id: true,
                        shipperName: true,
                        status: true,
                    }
                }
            }
        })

        const unreadCount = await db.notification.count({
            where: { userId, read: false }
        })

        return NextResponse.json({
            notifications,
            unreadCount
        })
    } catch (error) {
        console.error("[NOTIFICATIONS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

