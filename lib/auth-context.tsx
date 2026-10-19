"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface User {
  id: string
  email: string
  role: "admin" | "verificator" | "user"
  name: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => void
  signup: (email: string, password: string, name: string, role: "admin" | "verificator" | "user") => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    ;(async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null
        const headers: Record<string, string> = {}
        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include", headers })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
          localStorage.setItem("currentUser", JSON.stringify(userData))
        } else {
          setUser(null)
          localStorage.removeItem("currentUser")
          localStorage.removeItem("sessionToken")
        }
      } catch (e) {
        setUser(null)
        localStorage.removeItem("currentUser")
        localStorage.removeItem("sessionToken")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = "Login failed"
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error?.message || errorJson.message || errorText
        } catch {
          errorMessage = errorText || "Login failed"
        }
        throw new Error(errorMessage)
      }

      const userData = await res.json()
      setUser(userData)
      localStorage.setItem("currentUser", JSON.stringify(userData))
      if (userData.token) {
        localStorage.setItem("sessionToken", userData.token)
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const signup = async (email: string, password: string, name: string, role: "admin" | "verificator" | "user") => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = "Signup failed"
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error?.message || errorJson.message || errorText
        } catch {
          errorMessage = errorText || "Signup failed"
        }
        throw new Error(errorMessage)
      }

      const userData = await res.json()
      setUser(userData)
      localStorage.setItem("currentUser", JSON.stringify(userData))
      if (userData.token) {
        localStorage.setItem("sessionToken", userData.token)
      }
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    }
  }

  const loginWithGoogle = () => {
    window.location.href = "/api/auth/google"
  }

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
    setUser(null)
    localStorage.removeItem("currentUser")
    localStorage.removeItem("sessionToken")
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
