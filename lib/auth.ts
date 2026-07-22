import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
    process.env.AUTH_SECRET || "default-secret-key-change-in-prod"
);

export async function signSession(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(SECRET_KEY);
}

export async function verifySession() {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session?.value) {
        console.warn("[AUTH] Session cookie missing");
        return null;
    }

    try {
        const { payload } = await jwtVerify(session.value, SECRET_KEY, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        console.error("[AUTH] Session verification failed:", error);
        return null;
    }
}

export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // explicitly verify strictness if needed
    path: "/",
};

export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set("session", token, SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}
