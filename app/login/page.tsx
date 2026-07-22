"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2 } from "lucide-react"

type AuthMode = "login" | "signup"

function LoginFormContent() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"user" | "verificator" | "admin">("user")
  const [error, setError] = useState(urlError || "")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login, loginWithGoogle, signup } = useAuth()

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      await login(email, password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      await signup(email, password, name, role)
      setSuccess("Account created successfully! Redirecting...")
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Sistem Inspeksi Kontainer</CardTitle>
        <CardDescription>{mode === "login" ? "Masuk ke akun Anda" : "Buat akun baru"}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={mode === "login" ? handleLoginSubmit : handleSignupSubmit} className="space-y-4">
          {/* Name field - only for signup */}
          {mode === "signup" && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nama Lengkap
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Kata Sandi
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Role selection - only for signup */}
          {mode === "signup" && (
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Peran
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "user")}
                disabled={loading}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="user">Pengguna Umum</option>
              </select>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? mode === "login"
                ? "Sedang masuk..."
                : "Sedang membuat akun..."
              : mode === "login"
                ? "Masuk"
                : "Buat Akun"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">atau</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-accent font-medium"
          onClick={loginWithGoogle}
          disabled={loading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Masuk dengan Google
        </Button>

        {/* Toggle between login and signup */}
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setError("")
                setSuccess("")
                setEmail("")
                setPassword("")
                setName("")
                setRole("user")
              }}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Daftar" : "Masuk"}
            </button>
          </p>
        </div>

        {/* Demo credentials - only show on login mode */}
        {mode === "login" && (
          <div className="mt-6 pt-6 border-t space-y-2 text-xs text-muted-foreground">
            <p className="font-medium">Kredensial Demo:</p>
            <p>Admin: admin@example.com / password123</p>
            <p>Verificator: officer@example.com / password123</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center px-4 py-8">
      <Suspense
        fallback={
          <Card className="w-full max-w-md p-6 text-center text-muted-foreground">
            Memuat...
          </Card>
        }
      >
        <LoginFormContent />
      </Suspense>
    </div>
  )
}
