import { NextResponse } from "next/server"

export async function GET(req: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
    const proto = req.headers.get("x-forwarded-proto") || "https"
    const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    if (!clientId) {
        if (process.env.NODE_ENV === "production") {
            return NextResponse.redirect(`${baseUrl}/login?error=Google OAuth is not configured in production`)
        }
        // Mock mode for local testing without configured OAuth keys
        const mockCallbackUrl = `${redirectUri}?code=mock_google_code`
        return NextResponse.redirect(mockCallbackUrl)
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(googleAuthUrl)
}
