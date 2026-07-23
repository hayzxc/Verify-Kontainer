import { NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

export async function GET() {
  try {
    const session = await verifySession()
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error("[AUTH_ME_GET]", error)
    return apiError("Internal Error", 500)
  }
}
