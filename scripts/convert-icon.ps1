Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\HAYU\.gemini\antigravity-ide\brain\20f50dc7-a0fe-4450-8fc8-919ec97fdea1\media__1785219286572.png"
$publicDir = "d:\File Kerja\container-inspection-app\public"

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

$w = $srcImg.Width
$h = $srcImg.Height

# The circular logo is centered in the image. Take the central square based on the height.
$side = [Math]::Min($w, $h)
$cropX = [int](($w - $side) / 2)
$cropY = [int](($h - $side) / 2)

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $side, $side)

# Create cropped square bitmap
$croppedBmp = New-Object System.Drawing.Bitmap($side, $side)
$gCrop = [System.Drawing.Graphics]::FromImage($croppedBmp)
$gCrop.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

$gCrop.DrawImage($srcImg, (New-Object System.Drawing.Rectangle(0, 0, $side, $side)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$gCrop.Dispose()

function Resize-Fit-Image($source, $targetSize, $targetPath, $marginRatio = 0.02) {
    $destImage = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $graphics.Clear([System.Drawing.Color]::Transparent)
    
    $margin = [int]($targetSize * $marginRatio)
    $drawSize = $targetSize - ($margin * 2)
    $destRect = New-Object System.Drawing.Rectangle($margin, $margin, $drawSize, $drawSize)
    
    $graphics.DrawImage($source, $destRect, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    
    $destImage.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
    Write-Host "Saved fitted icon: $targetPath ($targetSize x $targetSize)"
}

# 1. apple-icon.png (512x512)
Resize-Fit-Image $croppedBmp 512 "$publicDir\apple-icon.png" 0.02

# 2. icon-light-32x32.png (32x32)
Resize-Fit-Image $croppedBmp 32 "$publicDir\icon-light-32x32.png" 0.01

# 3. icon-dark-32x32.png (32x32)
Resize-Fit-Image $croppedBmp 32 "$publicDir\icon-dark-32x32.png" 0.01

# 4. placeholder-logo.png (512x512)
Resize-Fit-Image $croppedBmp 512 "$publicDir\placeholder-logo.png" 0.02

$croppedBmp.Dispose()
$srcImg.Dispose()
