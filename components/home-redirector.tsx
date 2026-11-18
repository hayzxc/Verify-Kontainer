"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { GooeyLoader } from "@/components/ui/gooey-loader"

export function HomeRedirector() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Fast-path: if there is no cached session or token in localStorage and server had no cookie,
    // immediately route to /login without waiting for /api/auth/me network roundtrip.
    const hasLocalSession =
      typeof window !== "undefined" &&
      Boolean(localStorage.getItem("sessionToken") || localStorage.getItem("currentUser"))

    if (!hasLocalSession) {
      router.replace("/login")
      return
    }

    if (!loading) {
      router.replace(user ? "/dashboard" : "/login")
    }
  }, [user, loading, router])

  return <GooeyLoader fullScreen text="Menyiapkan Aplikasi..." size="lg" />
}
