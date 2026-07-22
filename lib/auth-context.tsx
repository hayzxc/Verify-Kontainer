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
    // Check for existing session (in a real app, verify token with backend)
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
          localStorage.setItem("currentUser", JSON.stringify(userData))
        } else {
          setUser(null)
          localStorage.removeItem("currentUser")
        }
      } catch (e) {
        setUser(null)
        localStorage.removeItem("currentUser")
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
        const error = await res.text()
        throw new Error(error || "Login failed")
      }

      const userData = await res.json()
      setUser(userData)
      localStorage.setItem("currentUser", JSON.stringify(userData))
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
        const error = await res.text()
        throw new Error(error || "Signup failed")
      }

      const userData = await res.json()
      setUser(userData)
      localStorage.setItem("currentUser", JSON.stringify(userData))
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
