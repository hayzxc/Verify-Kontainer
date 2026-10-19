"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, Loader2, AlertCircle, CheckCircle2, Search, User, Shield, KeyRound } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"

interface UserData {
  id: string
  name: string
  email: string
  role: "admin" | "verificator" | "user"
  createdAt?: string
  avatar?: string
  googleId?: string | null
}

export function UserManagement() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "verificator" as "admin" | "verificator" | "user",
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/users", { cache: "no-store" })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Gagal memuat daftar pengguna")
      }
      const json = await res.json()
      setUsers(json.data || [])
    } catch (err: any) {
      console.error("Gagal mengambil data pengguna:", err)
      setError(err.message || "Gagal mengambil data pengguna dari database")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Bersihkan data mockup lama di localStorage jika ada
    if (typeof window !== "undefined") {
      localStorage.removeItem("users")
    }
    fetchUsers()
  }, [])

  const hasAdmin = useMemo(() => {
    return users.some((u) => u.role === "admin")
  }, [users])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase().trim()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const cleanName = newUser.name.trim()
    const cleanEmail = newUser.email.trim()

    if (!cleanName || !cleanEmail || !newUser.password) {
      setError("Semua bidang formulir wajib diisi")
      return
    }

    if (newUser.password.length < 6) {
      setError("Kata sandi harus minimal 6 karakter")
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: newUser.password,
          role: newUser.role,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Gagal menambahkan pengguna")
      }

      setSuccess(`Akun untuk "${cleanName}" (${cleanEmail}) berhasil dibuat dan disimpan ke database! Akun sekarang dapat digunakan untuk login.`)
      setNewUser({ name: "", email: "", password: "", role: "verificator" })
      await fetchUsers()
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menambahkan pengguna")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userToDelete: UserData) => {
    if (userToDelete.id === currentUser?.id) {
      setError("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif")
      return
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus akun "${userToDelete.name}" (${userToDelete.email})? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }

    try {
      setDeletingId(userToDelete.id)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Gagal menghapus pengguna")
      }

      setSuccess(`Akun "${userToDelete.name}" berhasil dihapus.`)
      await fetchUsers()
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghapus pengguna")
    } finally {
      setDeletingId(null)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )
      case "verificator":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 gap-1">
            <KeyRound className="h-3 w-3" />
            Petugas Verifikasi
          </Badge>
        )
      case "user":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
            <User className="h-3 w-3" />
            Pengguna Umum
          </Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Kartu Tambah Pengguna */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Tambah Pengguna Baru</CardTitle>
              <CardDescription>
                Buat akun petugas verifikasi, pengguna umum, atau admin baru yang tersimpan langsung ke database
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-700 dark:text-green-300 animate-in fade-in-50">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input
                  placeholder="Contoh: Budi Santoso"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="budi@prana.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kata Sandi</label>
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Peran (Role)</label>
                <Select
                  value={newUser.role}
                  onValueChange={(role: "admin" | "verificator" | "user") =>
                    setNewUser({ ...newUser, role })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verificator">Petugas Verifikasi</SelectItem>
                    <SelectItem value="user">Pengguna Umum</SelectItem>
                    <SelectItem value="admin" disabled={hasAdmin}>
                      Admin {hasAdmin ? "(Maksimal 1 akun admin)" : ""}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan ke Database...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pengguna
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Kartu Daftar Pengguna */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Daftar Pengguna Sistem</CardTitle>
              <CardDescription>
                {loading
                  ? "Sedang memuat data dari database..."
                  : `Total ${users.length} pengguna terdaftar di sistem`}
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
              <p className="text-sm">Memuat daftar pengguna...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Tidak ada pengguna ditemukan</p>
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">
                  Coba sesuaikan kata kunci pencarian Anda
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredUsers.map((item) => {
                const isCurrent = item.id === currentUser?.id
                const isOnlyAdmin = item.role === "admin" && hasAdmin
                const isDeleting = deletingId === item.id

                return (
                  <div
                    key={item.id}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {getRoleBadge(item.role)}
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                              Akun Anda
                            </Badge>
                          )}
                          {item.googleId && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Google OAuth
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.email}</p>
                        {item.createdAt && (
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                            Terdaftar:{" "}
                            {new Date(item.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isCurrent || isOnlyAdmin || isDeleting}
                      onClick={() => handleDeleteUser(item)}
                      title={
                        isCurrent
                          ? "Tidak dapat menghapus akun Anda sendiri"
                          : isOnlyAdmin
                          ? "Tidak dapat menghapus satu-satunya admin"
                          : "Hapus pengguna"
                      }
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
