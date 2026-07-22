import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"

export async function POST() {
    try {
        const session = await verifySession()
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const userId = session.id as string

        const result = await db.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        })

        return NextResponse.json({ success: true, count: result.count })
    } catch (error) {
        console.error("[NOTIFICATIONS_MARK_ALL_READ]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
