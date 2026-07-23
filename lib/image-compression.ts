/**
 * Client-side Image Compression Utility
 * Resizes and compresses camera/file photos to JPEG using HTML5 Canvas.
 * Reduces Base64 payload weights by 90-95% (from ~3MB down to ~150KB).
 */

export async function compressImageBase64(
  base64DataUrl: string,
  maxDimension = 1280,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    // If invalid or empty data URL, return as is
    if (!base64DataUrl || !base64DataUrl.startsWith("data:image")) {
      resolve(base64DataUrl)
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      let { width, height } = img

      // Scale down proportionally if image exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(base64DataUrl)
        return
      }

      // Draw and compress to JPEG format
      ctx.drawImage(img, 0, 0, width, height)
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality)

      // Only return compressed if it's smaller than original
      if (compressedDataUrl.length < base64DataUrl.length) {
        resolve(compressedDataUrl)
      } else {
        resolve(base64DataUrl)
      }
    }

    img.onerror = () => {
      // Fallback to original if image fails to load
      resolve(base64DataUrl)
    }

    img.src = base64DataUrl
  })
}

/**
 * Calculates approximate byte size of a Base64 data URL.
 */
export function getBase64ByteSize(base64String: string): number {
  if (!base64String) return 0
  const headIndex = base64String.indexOf(",")
  const pureBase64 = headIndex >= 0 ? base64String.slice(headIndex + 1) : base64String
  const padding = pureBase64.endsWith("==") ? 2 : pureBase64.endsWith("=") ? 1 : 0
  return Math.max(0, Math.floor((pureBase64.length * 3) / 4) - padding)
}

/**
 * Formats bytes into human-readable text (e.g. 145 KB, 1.2 MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
