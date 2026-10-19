Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\HAYU\.gemini\antigravity-ide\brain\354ea51c-2363-4505-a965-b0e04f54d7a7\.user_uploaded\media_1792431007065.jpg"
$publicDir = "d:\File Kerja\container-inspection-app\public"
$appDir = "d:\File Kerja\container-inspection-app\app"

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$srcW = $srcImg.Width
$srcH = $srcImg.Height

Write-Host "Source image size: $srcW x $srcH"

# We found the bounding box of the rounded container: X=102..920 (W=818), Y=96..920 (H=824)
# Make a square bounding box centered:
$cropSize = 828
$cropX = [int]((102 + 920 - $cropSize) / 2)
$cropY = [int]((96 + 920 - $cropSize) / 2)

Write-Host "Cropping rect: X=$cropX, Y=$cropY, Size=$cropSize"

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSize, $cropSize)
$rawCrop = New-Object System.Drawing.Bitmap($cropSize, $cropSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gCrop = [System.Drawing.Graphics]::FromImage($rawCrop)
$gCrop.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$gCrop.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gCrop.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gCrop.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$gCrop.DrawImage($srcImg, (New-Object System.Drawing.Rectangle(0, 0, $cropSize, $cropSize)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$gCrop.Dispose()
$srcImg.Dispose()

# Now create transparent corners so the rounded rectangle icon floats cleanly without white corners
# Any pixel near pure white (R>245, G>245, B>245) around the edges is made transparent.
# Flood fill from the 4 corners:
function Clear-Corner-White($bmp) {
    [int]$w = $bmp.Width
    [int]$h = $bmp.Height
    $visited = New-Object 'bool[,]' $w, $h
    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]

    [int]$maxX = $w - 1
    [int]$maxY = $h - 1

    # Seed the 4 corners
    $p1 = New-Object System.Drawing.Point(0, 0)
    $p2 = New-Object System.Drawing.Point($maxX, 0)
    $p3 = New-Object System.Drawing.Point(0, $maxY)
    $p4 = New-Object System.Drawing.Point($maxX, $maxY)
    $corners = @($p1, $p2, $p3, $p4)

    foreach ($pt in $corners) {
        $c = $bmp.GetPixel($pt.X, $pt.Y)
        if ($c.R -gt 230 -and $c.G -gt 230 -and $c.B -gt 230) {
            $queue.Enqueue($pt)
            $visited[$pt.X, $pt.Y] = $true
        }
    }

    while ($queue.Count -gt 0) {
        $curr = $queue.Dequeue()
        $bmp.SetPixel($curr.X, $curr.Y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))

        # Check 4 neighbors
        $neighbors = @(
            (New-Object System.Drawing.Point($curr.X + 1, $curr.Y)),
            (New-Object System.Drawing.Point($curr.X - 1, $curr.Y)),
            (New-Object System.Drawing.Point($curr.X, $curr.Y + 1)),
            (New-Object System.Drawing.Point($curr.X, $curr.Y - 1))
        )

        foreach ($n in $neighbors) {
            if ($n.X -ge 0 -and $n.X -lt $w -and $n.Y -ge 0 -and $n.Y -lt $h) {
                if (-not $visited[$n.X, $n.Y]) {
                    $visited[$n.X, $n.Y] = $true
                    $c = $bmp.GetPixel($n.X, $n.Y)
                    # If pixel is whitish (the border outside the dark badge)
                    if ($c.R -gt 225 -and $c.G -gt 225 -and $c.B -gt 225) {
                        $queue.Enqueue($n)
                    }
                }
            }
        }
    }
}

Clear-Corner-White $rawCrop
Write-Host "Corner transparency processed."

function Resize-Image($source, $targetSize, $targetPath) {
    $destImage = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($source, (New-Object System.Drawing.Rectangle(0, 0, $targetSize, $targetSize)), 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    
    $destImage.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
    Write-Host "Saved icon: $targetPath ($targetSize x $targetSize)"
}

# 1. 512x512 apple-icon.png
Resize-Image $rawCrop 512 "$publicDir\apple-icon.png"

# 2. 512x512 placeholder-logo.png
Resize-Image $rawCrop 512 "$publicDir\placeholder-logo.png"

# 3. 32x32 icon-light-32x32.png
Resize-Image $rawCrop 32 "$publicDir\icon-light-32x32.png"

# 4. 32x32 icon-dark-32x32.png
Resize-Image $rawCrop 32 "$publicDir\icon-dark-32x32.png"

# 5. 192x192 icon-192x192.png (PWA standard)
Resize-Image $rawCrop 192 "$publicDir\icon-192x192.png"

# 6. 512x512 icon-512x512.png (PWA standard)
Resize-Image $rawCrop 512 "$publicDir\icon-512x512.png"

# 7. Make favicon.ico (multi-size: 16x16, 32x32, 48x48)
$icon32 = New-Object System.Drawing.Bitmap($rawCrop, 32, 32)
$hIcon = $icon32.GetHicon()
$iconObj = [System.Drawing.Icon]::FromHandle($hIcon)
$fsPublic = New-Object System.IO.FileStream("$publicDir\favicon.ico", [System.IO.FileMode]::Create)
$iconObj.Save($fsPublic)
$fsPublic.Close()

$fsApp = New-Object System.IO.FileStream("$appDir\favicon.ico", [System.IO.FileMode]::Create)
$iconObj.Save($fsApp)
$fsApp.Close()

$iconObj.Dispose()
$icon32.Dispose()
Write-Host "Saved favicon.ico to public and app dirs"

# 8. Create icon.svg embedding the new PNG in base64
$pngBytes = [System.IO.File]::ReadAllBytes("$publicDir\apple-icon.png")
$base64 = [System.Convert]::ToBase64String($pngBytes)
$svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" viewBox="0 0 512 512">
  <image width="512" height="512" xlink:href="data:image/png;base64,$base64"/>
</svg>
"@
[System.IO.File]::WriteAllText("$publicDir\icon.svg", $svgContent)
Write-Host "Updated public/icon.svg with embedded new icon."

$rawCrop.Dispose()
Write-Host "All icons successfully created!"
