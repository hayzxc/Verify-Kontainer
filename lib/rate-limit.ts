import { NextResponse } from "next/server"

/**
 * In-memory sliding window rate limiter.
 * Suitable for single-instance Vercel deployments.
 * For multi-region, upgrade to @upstash/ratelimit with Redis.
 */

interface RateLimitEntry {
    timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leaks (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries(windowMs: number) {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL) return
    lastCleanup = now

    const cutoff = now - windowMs
    for (const [key, entry] of store.entries()) {
        entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
        if (entry.timestamps.length === 0) {
            store.delete(key)
        }
    }
}

/**
 * Extract client IP from request headers.
 * Works with Vercel/Cloudflare proxy headers.
 */
function getClientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for")
    if (forwarded) {
        return forwarded.split(",")[0].trim()
    }
    const realIp = req.headers.get("x-real-ip")
    if (realIp) {
        return realIp.trim()
    }
    return "unknown"
}

interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    maxRequests: number
    /** Time window in milliseconds */
    windowMs: number
}

/** Pre-configured rate limit profiles */
export const RATE_LIMITS = {
    /** Auth routes: 5 requests per 60 seconds */
    auth: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
    /** Inspection submission: 10 requests per 60 seconds */
    submission: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
    /** General API: 60 requests per 60 seconds */
    general: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
}

/**
 * Check rate limit for a request.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 *
 * @param req - The incoming request
 * @param config - Rate limit configuration
 * @param prefix - Optional prefix to namespace the rate limit key (e.g., "auth-login")
 */
export function checkRateLimit(
    req: Request,
    config: RateLimitConfig,
    prefix: string = "api"
): NextResponse | null {
    const ip = getClientIp(req)
    const key = `${prefix}:${ip}`
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Periodic cleanup
    cleanupExpiredEntries(config.windowMs)

    // Get or create entry
    let entry = store.get(key)
    if (!entry) {
        entry = { timestamps: [] }
        store.set(key, entry)
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

    // Check if limit exceeded
    if (entry.timestamps.length >= config.maxRequests) {
        const oldestInWindow = entry.timestamps[0]
        const retryAfterMs = oldestInWindow + config.windowMs - now
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

        return NextResponse.json(
            {
                error: {
                    message: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfterSeconds} detik.`,
                    code: "RATE_LIMIT_EXCEEDED",
                    status: 429,
                },
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(retryAfterSeconds),
                    "X-RateLimit-Limit": String(config.maxRequests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": String(Math.ceil((oldestInWindow + config.windowMs) / 1000)),
                },
            }
        )
    }

    // Record this request
    entry.timestamps.push(now)

    return null // Allowed
}
