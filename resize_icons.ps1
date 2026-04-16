Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\sotol\.gemini\antigravity\brain\652e959d-c91f-43c0-9300-e96009bef7b6\pokepwa_icon_yellow_1776364802289.png"
$source = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Image($dest, $size) {
    if (Test-Path $dest) { Remove-Item $dest -Force }
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.DrawImage($source, 0, 0, $size, $size)
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $graph.Dispose()
    $bmp.Dispose()
    Write-Host "Created $dest"
}

$icons = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($size in $icons) {
    $outPath = "c:\Users\sotol\Desktop\pyCeleste\fe_vue\public\icons\icon-${size}x${size}.png"
    Resize-Image $outPath $size
}

# Favicon: 32x32 ICO mapping (simplified to Save using ICO extension might not work flawlessly with .NET ImageFormat, so we'll save it as PNG but rename to .ico, browsers typically understand it fine, or use PNG for favicon)
# Better: Just write out a 32x32 png and replace favicon.ico
if (Test-Path "c:\Users\sotol\Desktop\pyCeleste\fe_vue\public\favicon.ico") { Remove-Item "c:\Users\sotol\Desktop\pyCeleste\fe_vue\public\favicon.ico" -Force }
$bmp = New-Object System.Drawing.Bitmap(32, 32)
$graph = [System.Drawing.Graphics]::FromImage($bmp)
$graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph.DrawImage($source, 0, 0, 32, 32)
$bmp.Save("c:\Users\sotol\Desktop\pyCeleste\fe_vue\public\favicon.ico", [System.Drawing.Imaging.ImageFormat]::Icon)
$graph.Dispose()
$bmp.Dispose()

$source.Dispose()

Write-Host "All icons resized successfully!"
