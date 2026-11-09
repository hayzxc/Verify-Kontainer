import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { UpdateUserRoleSchema } from "@/lib/validations"

// PATCH /api/users/[id] - Ubah peran (role) pengguna (Hanya Admin)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession(req)
        if (!session) {
            return apiError("Unauthorized", 401)
        }
        if (session.role !== "admin") {
            return apiError("Forbidden: Hanya admin yang dapat mengubah peran pengguna", 403)
        }

        const { id } = await params
        const body = await req.json()
        const parseResult = UpdateUserRoleSchema.safeParse(body)
        if (!parseResult.success) {
            return apiError(parseResult.error.errors[0]?.message || "Peran pengguna tidak valid", 400)
        }

        const { role: newRole } = parseResult.data

        const targetUser = await db.user.findUnique({
            where: { id },
        })

        if (!targetUser) {
            return apiError("Pengguna tidak ditemukan", 404)
        }

        if (targetUser.role === newRole) {
            return apiSuccess(targetUser)
        }

        // Cek jika mencoba mendemote satu-satunya akun admin
        if (targetUser.role === "admin" && newRole !== "admin") {
            const adminCount = await db.user.count({
                where: { role: "admin" },
            })
            if (adminCount <= 1) {
                return apiError("Tidak dapat mengubah peran satu-satunya akun admin dalam sistem", 400)
            }
        }

        // Admin yang sedang aktif login tidak boleh mendemote dirinya sendiri
        if (targetUser.id === session.id && newRole !== "admin") {
            return apiError("Anda tidak dapat menurunkan peran akun Anda sendiri yang sedang aktif", 400)
        }

        const updatedUser = await db.user.update({
            where: { id },
            data: { role: newRole },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                googleId: true,
                createdAt: true,
            },
        })

        return apiSuccess(updatedUser)
    } catch (error) {
        console.error("[USER_PATCH_ROLE]", error)
        return apiError("Gagal mengubah peran pengguna", 500)
    }
}

// DELETE /api/users/[id] - Hapus pengguna (Hanya Admin)
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession(req)
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
