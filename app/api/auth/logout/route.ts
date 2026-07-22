import { NextResponse } from "next/server"

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete("session")
    return res
  } catch (error) {
    console.error("[AUTH_LOGOUT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
