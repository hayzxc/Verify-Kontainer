import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { ThemeProvider } from "next-themes"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { NotificationProvider } from "@/lib/notification-context"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Container Inspection App",
  description: "Container Inspection App",
  applicationName: "Container Inspection",
  authors: [{ name: "Prana Verification" }],
  keywords: ["container", "inspection", "verification", "logistics", "pwa"],
  generator: "Prana-verification",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Container Inspection App",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-light-32x32.png",
    apple: "/apple-icon.png",
  },
}

export const viewport = {
  themeColor: "#000000",
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

