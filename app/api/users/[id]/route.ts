import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"

// DELETE /api/users/[id] - Hapus pengguna (Hanya Admin)
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }
        if (session.role !== "admin") {
            return apiError("Forbidden: Hanya admin yang dapat menghapus pengguna", 403)
        }

        const { id } = await params

        const targetUser = await db.user.findUnique({
            where: { id },
        })

        if (!targetUser) {
            return apiError("Pengguna tidak ditemukan", 404)
        }

        // Tidak boleh menghapus akun sendiri yang sedang aktif login
        if (targetUser.id === session.id) {
            return apiError("Tidak dapat menghapus akun Anda sendiri yang sedang aktif", 400)
        }

        // Tidak boleh menghapus satu-satunya akun admin
        if (targetUser.role === "admin") {
            const adminCount = await db.user.count({
                where: { role: "admin" },
            })
            if (adminCount <= 1) {
                return apiError("Tidak dapat menghapus satu-satunya akun admin dalam sistem", 400)
            }
        }

        await db.user.delete({
            where: { id },
        })

        return apiSuccess({ message: "Pengguna berhasil dihapus" })
    } catch (error) {
        console.error("[USER_DELETE]", error)
        return apiError("Gagal menghapus pengguna", 500)
    }
}
