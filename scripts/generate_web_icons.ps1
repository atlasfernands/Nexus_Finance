param(
    [string]$OutputDir = (Join-Path $PSScriptRoot "..\\public")
)

Add-Type -AssemblyName System.Drawing

$resolvedOutputDir = [System.IO.Path]::GetFullPath($OutputDir)
[System.IO.Directory]::CreateDirectory($resolvedOutputDir) | Out-Null

$green = [System.Drawing.Color]::FromArgb(0, 255, 157)
$black = [System.Drawing.Color]::Black
$sizes = @(16, 32, 180, 192, 512)

function New-RoundedRectanglePath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2

    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    return $path
}

function New-NexusBitmap {
    param(
        [int]$Size,
        [switch]$FullBleed
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear($(if ($FullBleed) { $green } else { [System.Drawing.Color]::Transparent }))

    $padding = if ($FullBleed) { 0 } else { [Math]::Max([Math]::Round($Size * 0.06), 1) }
    $radius = if ($FullBleed) { 0 } else { [Math]::Round($Size * 0.22) }
    $path = $null
    $backgroundBrush = $null
    $strokeWidth = [Math]::Max($Size * 0.11, 2)
    $strokePen = New-Object System.Drawing.Pen($black, $strokeWidth)
    $strokePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $strokePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $strokePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $leftX = if ($FullBleed) { $Size * 0.305 } else { $Size * 0.328 }
    $rightX = if ($FullBleed) { $Size * 0.695 } else { $Size * 0.672 }
    $topY = if ($FullBleed) { $Size * 0.24 } else { $Size * 0.305 }
    $bottomY = if ($FullBleed) { $Size * 0.76 } else { $Size * 0.695 }

    if (-not $FullBleed) {
        $path = New-RoundedRectanglePath -X $padding -Y $padding -Width ($Size - ($padding * 2)) -Height ($Size - ($padding * 2)) -Radius $radius
        $backgroundBrush = New-Object System.Drawing.SolidBrush $green
        $graphics.FillPath($backgroundBrush, $path)
    }

    $graphics.DrawLine($strokePen, $leftX, $bottomY, $leftX, $topY)
    $graphics.DrawLine($strokePen, $leftX, $topY, $rightX, $bottomY)
    $graphics.DrawLine($strokePen, $rightX, $bottomY, $rightX, $topY)

    if ($path) {
        $path.Dispose()
    }

    if ($backgroundBrush) {
        $backgroundBrush.Dispose()
    }

    $strokePen.Dispose()
    $graphics.Dispose()

    return $bitmap
}

foreach ($size in $sizes) {
    $fullBleed = $size -ge 180
    $bitmap = New-NexusBitmap -Size $size -FullBleed:$fullBleed

    switch ($size) {
        16 { $fileName = "favicon-16x16.png" }
        32 { $fileName = "favicon-32x32.png" }
        180 { $fileName = "apple-touch-icon.png" }
        192 { $fileName = "icon-192.png" }
        512 { $fileName = "icon-512.png" }
        default { $fileName = "icon-$size.png" }
    }

    $bitmap.Save((Join-Path $resolvedOutputDir $fileName), [System.Drawing.Imaging.ImageFormat]::Png)

    if ($size -eq 32) {
        $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
        $stream = [System.IO.File]::Open((Join-Path $resolvedOutputDir "favicon.ico"), [System.IO.FileMode]::Create)
        $icon.Save($stream)
        $stream.Close()
        $icon.Dispose()
    }

    $bitmap.Dispose()
}

Write-Output "Web icons generated in $resolvedOutputDir"
