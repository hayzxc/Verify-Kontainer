import { db } from "@/lib/db"

// Helper to create notifications for all admins
export async function notifyAdmins(type: string, title: string, message: string, inspectionId: number) {
    try {
        const admins = await db.user.findMany({
            where: { role: "admin" },
            select: { id: true }
        })

        if (admins.length === 0) return

        await db.notification.createMany({
            data: admins.map(admin => ({
                userId: admin.id,
                type,
                title,
                message,
                inspectionId
            }))
        })
    } catch (error) {
        console.error("[NOTIFY_ADMINS]", error)
    }
}

// Helper to notify a specific user
export async function notifyUser(userId: string, type: string, title: string, message: string, inspectionId?: number) {
    try {
        await db.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                inspectionId: inspectionId || null
            }
        })
    } catch (error) {
        console.error("[NOTIFY_USER]", error)
    }
}

// Get userId from user's name (since createdBy is name, not id)
export async function getUserIdByName(name: string): Promise<string | null> {
    try {
        const user = await db.user.findFirst({
            where: { name },
            select: { id: true }
        })
        return user?.id || null
    } catch (error) {
        console.error("[GET_USER_ID]", error)
        return null
    }
}
