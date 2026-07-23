import { NextResponse } from "next/server"
import { apiError } from "@/lib/api-response"

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete("session")
    return res
  } catch (error) {
    console.error("[AUTH_LOGOUT_POST]", error)
    return apiError("Internal Error", 500)
  }
}
