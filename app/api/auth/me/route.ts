import { NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await verifySession()
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error("[AUTH_ME_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
