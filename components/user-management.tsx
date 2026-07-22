"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserData {
  id: string
  name: string
  email: string
  password: string
  role: "admin" | "verificator"
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "verificator" as const })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("users")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setUsers(Array.isArray(parsed) ? parsed : [])
      } catch (e) {
        console.error("Failed to load users:", e)
        setUsers([])
      }
    } else {
      const defaultUsers: UserData[] = [
        {
          id: "1",
          name: "Admin User",
          email: "admin@example.com",
          password: "password123",
          role: "admin",
        },
        {
          id: "2",
          name: "Officer One",
          email: "officer@example.com",
          password: "password123",
          role: "verificator",
        },
      ]
      setUsers(defaultUsers)
      localStorage.setItem("users", JSON.stringify(defaultUsers))
    }
  }, [])

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.email || !newUser.password) return

    const user: UserData = {
      id: Date.now().toString(),
      ...newUser,
    }

    const updated = [...users, user]
    setUsers(updated)
    localStorage.setItem("users", JSON.stringify(updated))
    setNewUser({ name: "", email: "", password: "", role: "verificator" })
  }

  const handleDeleteUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id)
    setUsers(updated)
    localStorage.setItem("users", JSON.stringify(updated))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Pengguna Baru</CardTitle>
          <CardDescription>Buat akun admin atau verifikator baru</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama</label>
                <Input
                  placeholder="John Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kata Sandi</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Peran</label>
                <Select value={newUser.role} onValueChange={(role: any) => setNewUser({ ...newUser, role })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="verificator">Petugas Verifikasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pengguna
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pengguna</CardTitle>
          <CardDescription>Total pengguna: {users.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Peran: <span className="capitalize">{user.role}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteUser(user.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
