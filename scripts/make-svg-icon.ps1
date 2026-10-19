$pngPath = "d:\File Kerja\container-inspection-app\public\apple-icon.png"
$bytes = [System.IO.File]::ReadAllBytes($pngPath)
$base64 = [System.Convert]::ToBase64String($bytes)

$svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" viewBox="0 0 512 512">
  <image width="512" height="512" xlink:href="data:image/png;base64,$base64"/>
</svg>
"@

[System.IO.File]::WriteAllText("d:\File Kerja\container-inspection-app\public\icon.svg", $svgContent)
Write-Host "icon.svg updated with base64 embedded image."
