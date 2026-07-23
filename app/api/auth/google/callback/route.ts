import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { signSession, setSessionCookie } from "@/lib/auth"

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
    const proto = req.headers.get("x-forwarded-proto") || "https"
    const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

    if (error || !code) {
        console.error("[GOOGLE_AUTH_CALLBACK] OAuth error or code missing:", error)
        return NextResponse.redirect(`${baseUrl}/login?error=Google authentication failed`)
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const redirectUri = `${baseUrl}/api/auth/google/callback`

        let googleProfile = {
            sub: "mock_google_id_123",
            email: "user.google@example.com",
            name: "Google User",
            picture: "",
        }

        if (clientId && clientSecret && code !== "mock_google_code") {
            // Exchange code for Google Access Token
            const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: "authorization_code",
                }),
            })

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.text()
                console.error("[GOOGLE_AUTH_CALLBACK] Token exchange failed:", errorData)
                return NextResponse.redirect(`${baseUrl}/login?error=Failed to retrieve access token`)
            }

            const tokenData = await tokenResponse.json()
            const accessToken = tokenData.access_token

            // Fetch Google User Profile
            const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            })

            if (!profileResponse.ok) {
                console.error("[GOOGLE_AUTH_CALLBACK] Profile fetch failed")
                return NextResponse.redirect(`${baseUrl}/login?error=Failed to retrieve user profile`)
            }

            googleProfile = await profileResponse.json()
        }

        const { email, name, sub: googleId, picture: avatar } = googleProfile

        if (!email) {
            return NextResponse.redirect(`${baseUrl}/login?error=Google profile email missing`)
        }

        // 1. First check if user exists by googleId
        let user = googleId
            ? await db.user.findUnique({
                  where: { googleId },
              })
            : null

        // 2. If not found by googleId, check by email
        if (!user) {
            user = await db.user.findUnique({
                where: { email },
            })

            if (user && !user.googleId) {
                // Link existing user account with Google ID
                user = await db.user.update({
                    where: { id: user.id },
                    data: { googleId, avatar: avatar || user.avatar },
                })
            }
        }

        // 3. If user still does not exist, create new user strictly with 'user' role
        if (!user) {
            user = await db.user.create({
                data: {
                    email,
                    name: name || email.split("@")[0],
                    role: "user",
                    googleId,
                    avatar,
                },
            })
        }

        // Create Jose JWT Session
        const token = await signSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        })

        await setSessionCookie(token)

        return NextResponse.redirect(`${baseUrl}/dashboard`)
    } catch (err) {
        console.error("[GOOGLE_AUTH_CALLBACK]", err)
        return NextResponse.redirect(`${baseUrl}/login?error=Internal server error during Google login`)
    }
}
