import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
    process.env.AUTH_SECRET || "default-secret-key-change-in-prod"
);

export async function signSession(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(SECRET_KEY);
}

export async function verifySession(req?: Request) {
    let token: string | undefined

    // 1. Check req Authorization header if passed
    if (req) {
        const authHeader = req.headers.get("authorization")
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.slice(7).trim()
        }
    }

    // 2. Check next/headers headers()
    if (!token) {
        try {
            const reqHeaders = await headers()
            const authHeader = reqHeaders.get("authorization")
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader.slice(7).trim()
            }
        } catch {}
    }

    // 3. Fallback to session cookie
    if (!token) {
        try {
            const cookieStore = await cookies();
            const session = cookieStore.get("session");
            token = session?.value
        } catch {}
    }

    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY, {
            algorithms: ["HS256"],
        });
        return payload as { id: string; role: "admin" | "verificator" | "user"; email: string; name: string };
    } catch (error) {
        console.error("[AUTH] Session verification failed:", error);
        return null;
    }
}

// Only enable secure cookies if served over HTTPS (production with https URL or Vercel production)
const isHttps = (process.env.NEXT_PUBLIC_APP_URL || "").startsWith("https://") ||
                process.env.VERCEL_ENV === "production";

export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
};

export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set("session", token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}

