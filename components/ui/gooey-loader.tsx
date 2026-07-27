"use client"

import { useId } from "react"

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
  const filterId = useId().replace(/:/g, "")
  const filterUrl = `url(#gooey-${filterId})`

  // Scale configurations
  const dimensions = {
    sm: { container: "w-28 h-14", main: "w-9 h-9", satellite: "w-6 h-6", text: "text-xs" },
    md: { container: "w-36 h-20", main: "w-14 h-14", satellite: "w-9 h-9", text: "text-sm" },
    lg: { container: "w-48 h-28", main: "w-20 h-20", satellite: "w-12 h-12", text: "text-base" },
  }[size]

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Hidden SVG Filter Definition for Liquid Gooey Effect */}
      <svg className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
        <defs>
          <filter id={`gooey-${filterId}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Gooey Liquid Animation Container */}
      <div
        style={{ filter: filterUrl }}
        className={`relative flex items-center justify-center ${dimensions.container}`}
      >
        {/* Main Left Blob */}
        <div
          className={`${dimensions.main} bg-blue-500 rounded-full animate-gooey-main shadow-lg shadow-blue-500/30`}
        />
        {/* Satellite Right Blob */}
        <div
          className={`${dimensions.satellite} bg-blue-500 rounded-full animate-gooey-satellite absolute shadow-md shadow-blue-500/20`}
        />
      </div>

      {/* Optional Loading Label */}
      {text && (
        <p className={`${dimensions.text} font-medium text-muted-foreground animate-pulse text-center`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md transition-all">
        {loaderContent}
      </div>
    )
  }

  return loaderContent
}
