"use client"

interface GooeyLoaderProps {
  size?: "sm" | "md" | "lg"
  text?: string
  fullScreen?: boolean
  className?: string
}

export function GooeyLoader({
  size = "md",
  text,
  fullScreen = false,
  className = "",
}: GooeyLoaderProps) {
  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={text || "Memuat Aplikasi"}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-blue-50/70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-6 select-none ${className}`}
      >
        <div className="flex flex-col items-center justify-center gap-6 animate-splash-in max-w-xs w-full">
          {/* Branded App Icon Emblem with GPU-Accelerated Pulse Ring */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-3 rounded-3xl bg-blue-500/20 dark:bg-blue-400/20 animate-splash-ring" />
            <div className="relative w-20 h-20 rounded-2xl bg-slate-900 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xl shadow-blue-950/15 dark:shadow-blue-500/10 flex items-center justify-center overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192x192.png"
                alt="Prana Verify"
                width={64}
                height={64}
                decoding="async"
                fetchPriority="high"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Brand Title & Subtitle */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Prana Verify
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sistem Inspeksi Kontainer
            </p>
          </div>

          {/* Sleek GPU-Accelerated Indeterminate Progress Bar */}
          <div className="w-48 space-y-2.5">
            <div className="h-1.5 w-full rounded-full bg-slate-200/90 dark:bg-slate-800 overflow-hidden">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 animate-loading-bar" />
            </div>
            {text && (
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
                {text}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Inline compact spinner (GPU-accelerated, zero heavy SVG filters)
  const dimensions = {
    sm: { ring: "w-6 h-6 border-2", text: "text-xs" },
    md: { ring: "w-9 h-9 border-[3px]", text: "text-sm" },
    lg: { ring: "w-12 h-12 border-[3px]", text: "text-base" },
  }[size]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className={`${dimensions.ring} rounded-full border-blue-500/20 border-t-blue-600 dark:border-blue-400/20 dark:border-t-blue-400 animate-spin`}
      />
      {text && (
        <p className={`${dimensions.text} font-medium text-muted-foreground text-center`}>
          {text}
        </p>
      )}
    </div>
  )
}
