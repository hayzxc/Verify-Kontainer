"use client"

import dynamic from "next/dynamic"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { GooeyLoader } from "@/components/ui/gooey-loader"

const AdminDashboard = dynamic(
  () => import("@/components/admin-dashboard").then((mod) => mod.AdminDashboard),
  {
    loading: () => <GooeyLoader fullScreen text="Memuat Dasbor Admin..." size="lg" />,
  }
)

const VerificatorDashboard = dynamic(
  () => import("@/components/verificator-dashboard").then((mod) => mod.VerificatorDashboard),
  {
    loading: () => <GooeyLoader fullScreen text="Memuat Dasbor Verifikator..." size="lg" />,
  }
)

export default function DashboardPage() {
  const { user, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login")
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
