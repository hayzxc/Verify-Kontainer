"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AdminDashboard } from "@/components/admin-dashboard"
import { VerificatorDashboard } from "@/components/verificator-dashboard"
import { GooeyLoader } from "@/components/ui/gooey-loader"

export default function DashboardPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return <GooeyLoader fullScreen text="Memuat Dasbor..." size="lg" />
  }

  if (!user) {

    return null
  }


  return user.role === "admin" ? <AdminDashboard user={user} /> : <VerificatorDashboard user={user} />
}
