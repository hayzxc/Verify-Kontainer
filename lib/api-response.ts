import { NextResponse } from "next/server"

/**
 * Standardized API error response.
 * Returns JSON: { error: { message, code, status } }
 */
export function apiError(
    message: string,
    status: number,
    code?: string
): NextResponse {
    return NextResponse.json(
        {
            error: {
                message,
                code: code || getDefaultErrorCode(status),
                status,
            },
        },
        { status }
    )
}

/**
 * Standardized API success response.
 * Returns JSON: { data, metadata? }
 */
export function apiSuccess<T>(
    data: T,
    metadata?: Record<string, unknown>,
    status: number = 200
): NextResponse {
    const body: { data: T; metadata?: Record<string, unknown> } = { data }
    if (metadata) {
        body.metadata = metadata
    }
    return NextResponse.json(body, { status })
}

/**
 * Map HTTP status codes to default error codes.
 */
function getDefaultErrorCode(status: number): string {
    switch (status) {
        case 400:
            return "BAD_REQUEST"
        case 401:
            return "UNAUTHORIZED"
        case 403:
            return "FORBIDDEN"
        case 404:
            return "NOT_FOUND"
        case 429:
            return "RATE_LIMIT_EXCEEDED"
        case 500:
            return "INTERNAL_ERROR"
        default:
            return "UNKNOWN_ERROR"
    }
}
