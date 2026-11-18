"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { GooeyLoader } from "@/components/ui/gooey-loader"

export function HomeRedirector() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // app/page.tsx already checked server-side cookies and found no valid cookie session.
    // Only Bearer-token sessions (e.g. Capacitor mobile) can still be valid without a cookie.
    const hasBearerToken =
      typeof window !== "undefined" && Boolean(localStorage.getItem("sessionToken"))

    if (!hasBearerToken) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("currentUser")
      }
      router.replace("/login")
      return
    }

    if (!loading) {
      router.replace(user ? "/dashboard" : "/login")
    }
  }, [user, loading, router])

  return <GooeyLoader fullScreen text="Menyiapkan Aplikasi..." size="lg" />
}
