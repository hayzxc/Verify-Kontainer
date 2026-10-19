import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { verifySession } from "@/lib/auth"
import { SignupSchema } from "@/lib/validations"
import { apiError, apiSuccess } from "@/lib/api-response"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

// GET /api/users - Ambil daftar semua pengguna (Hanya Admin)
export async function GET(req: Request) {
    try {
        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }
        if (session.role !== "admin") {
            return apiError("Forbidden: Hanya admin yang dapat mengakses daftar pengguna", 403)
        }

        const users = await db.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                googleId: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        return apiSuccess(users)
    } catch (error) {
        console.error("[USERS_GET]", error)
        return apiError("Terjadi kesalahan pada server", 500)
    }
}

// POST /api/users - Tambah pengguna baru (Hanya Admin)
export async function POST(req: Request) {
    try {
        const rateLimitResponse = checkRateLimit(req, RATE_LIMITS.auth, "admin-create-user")
        if (rateLimitResponse) return rateLimitResponse

        const session = await verifySession()
        if (!session) {
            return apiError("Unauthorized", 401)
        }
        if (session.role !== "admin") {
            return apiError("Forbidden: Hanya admin yang dapat menambah pengguna", 403)
        }

        const body = await req.json()
        const result = SignupSchema.safeParse(body)

        if (!result.success) {
            return apiError(result.error.errors[0].message, 400)
        }

        const { email, password, name, role } = result.data
        const cleanEmail = email.trim().toLowerCase()
        const cleanName = name.trim()

        // Single Admin Enforcement
        if (role === "admin") {
            const existingAdmin = await db.user.findFirst({
                where: { role: "admin" },
            })
            if (existingAdmin) {
                return apiError("Hanya satu akun admin yang diizinkan dalam sistem", 400)
            }
        }

        // Cek duplikasi email secara case-insensitive
        const existingUser = await db.user.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: "insensitive",
                },
            },
        })

        if (existingUser) {
            return apiError("Email sudah terdaftar dalam sistem", 409)
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await db.user.create({
            data: {
                email: cleanEmail,
                name: cleanName,
                password: hashedPassword,
                role,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        })

        return apiSuccess(user, undefined, 201)
    } catch (error) {
        console.error("[USERS_POST]", error)
        return apiError("Gagal menambahkan pengguna", 500)
    }
}
