import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { verifySession } from "@/lib/auth"
import { SignupSchema } from "@/lib/validations"

export async function POST(req: Request) {
    try {
        // Only admins can create new users
        const session = await verifySession()
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }
        if (session.role !== "admin") {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const body = await req.json()

        // Validate input using Zod
        const result = SignupSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse(result.error.errors[0].message, { status: 400 })
        }

        const { email, password, name, role } = result.data

        // Single Admin Enforcement: Only 1 admin account allowed in system
        if (role === "admin") {
            const existingAdmin = await db.user.findFirst({
                where: { role: "admin" },
            })
            if (existingAdmin) {
                return new NextResponse("Only one admin account is allowed in the system", { status: 400 })
            }
        }

        const existingUser = await db.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return new NextResponse("Email already registered", { status: 409 })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await db.user.create({
            data: { email, name, password: hashedPassword, role },
        })

        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json(userWithoutPassword, { status: 201 })
    } catch (error) {
        console.error("[SIGNUP_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
