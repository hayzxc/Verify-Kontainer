"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"

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
  // Keep initial SSR & client hydration state identical to prevent hydration mismatch
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Tracks explicit auth transitions (login/signup/logout) so stale mount checks cannot overwrite newer state
  const authVersionRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    const requestVersion = authVersionRef.current

    // 1. Hydrate cached user immediately for instant first-paint on returning sessions
    try {
      const stored = localStorage.getItem("currentUser")
      if (stored) {
        const parsed = JSON.parse(stored) as User
        if (parsed?.id) {
          setUser(parsed)
          setLoading(false)
        }
      }
    } catch {
      localStorage.removeItem("currentUser")
    }

    // 2. Verify live session in background (also picks up Google OAuth cookie sessions)
    ;(async () => {
      try {
        const token = localStorage.getItem("sessionToken")
        const headers: Record<string, string> = {}
        if (token) headers["Authorization"] = `Bearer ${token}`

        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
          headers,
          signal: controller.signal,
        })

        // Ignore stale response if login/signup/logout occurred while this request was in flight
        if (controller.signal.aborted || authVersionRef.current !== requestVersion) {
          return
        }

        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
          localStorage.setItem("currentUser", JSON.stringify(userData))
        } else if (res.status === 401) {
          // Only clear stored session on explicit unauthorized response
          setUser(null)
          localStorage.removeItem("currentUser")
          localStorage.removeItem("sessionToken")
        }
      } catch {
        // Keep cached session intact on transient offline/network errors (do not log user out on shaky mobile signal)
      } finally {
        if (!controller.signal.aborted && authVersionRef.current === requestVersion) {
          setLoading(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
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
      authVersionRef.current += 1
      setUser(userData)
      setLoading(false)
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
      authVersionRef.current += 1
      setUser(userData)
      setLoading(false)
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
    authVersionRef.current += 1
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => { })
    setUser(null)
    setLoading(false)
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
