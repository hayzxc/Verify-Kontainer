"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AdminDashboard } from "@/components/admin-dashboard"
import { VerificatorDashboard } from "@/components/verificator-dashboard"

export default function DashboardPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()



  useEffect(() => {
    if (!loading && !isAuthenticated) {

      router.push("/login")
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {

    return null
  }


  return user.role === "admin" ? <AdminDashboard user={user} /> : <VerificatorDashboard user={user} />
}
