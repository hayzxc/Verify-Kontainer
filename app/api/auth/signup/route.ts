import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { verifySession } from "@/lib/auth"
import { SignupSchema } from "@/lib/validations"
import { apiError } from "@/lib/api-response"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"

export async function POST(req: Request) {
    try {
        // Rate limiting check
        const rateLimitResponse = checkRateLimit(req, RATE_LIMITS.auth, "auth-signup")
        if (rateLimitResponse) return rateLimitResponse

        const session = await verifySession()
        const body = await req.json()

        // Validate input using Zod
        const result = SignupSchema.safeParse(body)

        if (!result.success) {
            return apiError(result.error.errors[0].message, 400)
        }

        const { email, password, name, role } = result.data
        const cleanEmail = email.trim().toLowerCase()
        const cleanName = name.trim()

        // Only admins can create admin or verificator accounts
        if (role !== "user") {
            if (!session) {
                return apiError("Unauthorized", 401)
            }
            if (session.role !== "admin") {
                return apiError("Forbidden: Hanya admin yang dapat membuat akun ini", 403)
            }
        }

        // Single Admin Enforcement: Only 1 admin account allowed in system
        if (role === "admin") {
            const existingAdmin = await db.user.findFirst({
                where: { role: "admin" },
            })
            if (existingAdmin) {
                return apiError("Only one admin account is allowed in the system", 400)
            }
        }

        const existingUser = await db.user.findFirst({
            where: {
                email: {
                    equals: cleanEmail,
                    mode: "insensitive",
                },
            },
        })

        if (existingUser) {
            return apiError("Email already registered", 409)
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await db.user.create({
            data: { email: cleanEmail, name: cleanName, password: hashedPassword, role },
        })

        const { password: _, ...userWithoutPassword } = user

        let token: string | undefined
        // If self-registration by public user (no session), log them in directly
        if (!session) {
            const { signSession, SESSION_COOKIE_OPTIONS } = await import("@/lib/auth")
            token = await signSession({
                id: user.id,
                role: user.role,
                email: user.email,
                name: user.name,
            })
            const res = NextResponse.json({ ...userWithoutPassword, token }, { status: 201 })
            res.cookies.set("session", token, SESSION_COOKIE_OPTIONS)
            return res
        }

        return NextResponse.json(userWithoutPassword, { status: 201 })
    } catch (error) {
        console.error("[SIGNUP_POST]", error)
        return apiError("Internal Error", 500)
    }
}
