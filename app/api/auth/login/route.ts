import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { signSession, SESSION_COOKIE_OPTIONS } from "@/lib/auth"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { email, password } = body

        if (!email || !password) {
            return new NextResponse("Missing credentials", { status: 400 })
        }

        const user = await db.user.findUnique({
            where: {
                email,
            },
        })

        if (!user || !user.password) {
            return new NextResponse("Invalid credentials", { status: 401 })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return new NextResponse("Invalid credentials", { status: 401 })
        }

        // Return user info without password
        // Set session cookie
        const token = await signSession({
            id: user.id,
            role: user.role,
            email: user.email,
            name: user.name
        })

        const { password: _, ...userWithoutPassword } = user

        const res = NextResponse.json(userWithoutPassword)
        res.cookies.set("session", token, SESSION_COOKIE_OPTIONS)
        return res
    } catch (error) {
        console.error("[LOGIN_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
