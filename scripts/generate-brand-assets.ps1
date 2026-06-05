Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ogDir = Join-Path $root "public\og"
$iconDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $ogDir, $iconDir | Out-Null

$deepGreen = [System.Drawing.ColorTranslator]::FromHtml("#1F3D36")
$olive = [System.Drawing.ColorTranslator]::FromHtml("#6E7A47")
$warmWhite = [System.Drawing.ColorTranslator]::FromHtml("#F7F1E8")
$cream = [System.Drawing.ColorTranslator]::FromHtml("#FFF8ED")
$gold = [System.Drawing.ColorTranslator]::FromHtml("#D7B979")
$mist = [System.Drawing.ColorTranslator]::FromHtml("#BBAE99")
$stone = [System.Drawing.ColorTranslator]::FromHtml("#3B332B")

function New-Font($family, $size, $style = [System.Drawing.FontStyle]::Regular) {
  try {
    return [System.Drawing.Font]::new($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  } catch {
    return [System.Drawing.Font]::new("Arial", $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  }
}

function U([int[]]$codes) {
  return -join ($codes | ForEach-Object { [char]$_ })
}

function Add-RoundedRectangle($graphicsPath, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $d = $r * 2
  $graphicsPath.AddArc($x, $y, $d, $d, 180, 90)
  $graphicsPath.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $graphicsPath.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $graphicsPath.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $graphicsPath.CloseFigure()
}

function Fill-RoundedRectangle($g, $brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  Add-RoundedRectangle $path $x $y $w $h $r
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-RoundedRectangle($g, $pen, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  Add-RoundedRectangle $path $x $y $w $h $r
  $g.DrawPath($pen, $path)
  $path.Dispose()
}

function New-Graphics($bitmap) {
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  return $g
}

function Draw-CalendarMark($g, [float]$x, [float]$y, [float]$scale, $accentColor) {
  $cardBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(238, 255, 252, 244))
  $softBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(235, 241, 232, 207))
  $linePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(140, 31, 61, 54), 3 * $scale)
  $accentPen = [System.Drawing.Pen]::new($accentColor, 4 * $scale)

  Fill-RoundedRectangle $g $cardBrush $x $y (360 * $scale) (300 * $scale) (30 * $scale)
  Draw-RoundedRectangle $g $linePen $x $y (360 * $scale) (300 * $scale) (30 * $scale)

  for ($i = 0; $i -lt 5; $i++) {
    $rowY = $y + (62 + $i * 42) * $scale
    $g.DrawLine($linePen, $x + 42 * $scale, $rowY, $x + 316 * $scale, $rowY)
  }
  for ($i = 0; $i -lt 4; $i++) {
    $colX = $x + (86 + $i * 58) * $scale
    $g.DrawLine($linePen, $colX, $y + 42 * $scale, $colX, $y + 258 * $scale)
  }

  Fill-RoundedRectangle $g $softBrush ($x + 44 * $scale) ($y + 84 * $scale) (92 * $scale) (34 * $scale) (12 * $scale)
  Fill-RoundedRectangle $g $softBrush ($x + 164 * $scale) ($y + 168 * $scale) (126 * $scale) (34 * $scale) (12 * $scale)
  $g.DrawLine($accentPen, $x + 56 * $scale, $y + 236 * $scale, $x + 300 * $scale, $y + 236 * $scale)

  $cardBrush.Dispose()
  $softBrush.Dispose()
  $linePen.Dispose()
  $accentPen.Dispose()
}

function Draw-DashboardMark($g, [float]$x, [float]$y, [float]$scale, $accentColor) {
  $cardBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(238, 255, 252, 244))
  $panelBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(235, 247, 241, 232))
  $linePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(135, 31, 61, 54), 3 * $scale)
  $accentPen = [System.Drawing.Pen]::new($accentColor, 5 * $scale)

  Fill-RoundedRectangle $g $cardBrush $x $y (380 * $scale) (306 * $scale) (30 * $scale)
  Draw-RoundedRectangle $g $linePen $x $y (380 * $scale) (306 * $scale) (30 * $scale)
  Fill-RoundedRectangle $g $panelBrush ($x + 32 * $scale) ($y + 44 * $scale) (128 * $scale) (88 * $scale) (18 * $scale)
  Fill-RoundedRectangle $g $panelBrush ($x + 188 * $scale) ($y + 44 * $scale) (160 * $scale) (88 * $scale) (18 * $scale)
  Fill-RoundedRectangle $g $panelBrush ($x + 32 * $scale) ($y + 160 * $scale) (316 * $scale) (96 * $scale) (18 * $scale)

  $g.DrawLine($accentPen, $x + 56 * $scale, $y + 92 * $scale, $x + 136 * $scale, $y + 92 * $scale)
  $g.DrawLine($accentPen, $x + 214 * $scale, $y + 92 * $scale, $x + 320 * $scale, $y + 92 * $scale)
  for ($i = 0; $i -lt 4; $i++) {
    $rowY = $y + (186 + $i * 18) * $scale
    $g.DrawLine($linePen, $x + 58 * $scale, $rowY, $x + 320 * $scale, $rowY)
  }

  $cardBrush.Dispose()
  $panelBrush.Dispose()
  $linePen.Dispose()
  $accentPen.Dispose()
}

function Save-OgImage($path, $variant) {
  $bmp = [System.Drawing.Bitmap]::new(1200, 630)
  $g = New-Graphics $bmp
  $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Rectangle]::new(0, 0, 1200, 630),
    $warmWhite,
    [System.Drawing.ColorTranslator]::FromHtml("#EDF2EA"),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
  )
  $g.FillRectangle($bgBrush, 0, 0, 1200, 630)

  $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(38, 215, 185, 121))
  Fill-RoundedRectangle $g $accentBrush 830 70 250 250 80
  Fill-RoundedRectangle $g $accentBrush 64 438 280 96 40

  $titleFont = New-Font "Microsoft JhengHei UI" 64 ([System.Drawing.FontStyle]::Bold)
  $subFont = New-Font "Microsoft JhengHei UI" 36 ([System.Drawing.FontStyle]::Regular)
  $pillFont = New-Font "Microsoft JhengHei UI" 28 ([System.Drawing.FontStyle]::Bold)
  $eyebrowFont = New-Font "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold)
  $greenBrush = [System.Drawing.SolidBrush]::new($deepGreen)
  $stoneBrush = [System.Drawing.SolidBrush]::new($stone)
  $goldBrush = [System.Drawing.SolidBrush]::new($gold)

  if ($variant -eq "front") {
    $g.DrawString("Li's Meet Pro Fitness", $titleFont, $greenBrush, 82, 126)
    $g.DrawString((U @(20491,20154,34892,31243,33287,35506,31243,38928,32004)), $subFont, $stoneBrush, 86, 216)
    Fill-RoundedRectangle $g ([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 31, 61, 54))) 86 296 600 62 31
    $g.DrawString((U @(27599,36913,22266,23450,35506,32,124,32,21363,26178,38928,32004,32,124,32,25163,27231,26597,30475)), $pillFont, [System.Drawing.Brushes]::White, 118, 310)
    $g.DrawString("Boutique coaching schedule", $eyebrowFont, $goldBrush, 90, 92)
    Draw-CalendarMark $g 760 190 1.0 $gold
  } else {
    $g.DrawString("Li's Meet Coach Dashboard", $titleFont, $greenBrush, 82, 126)
    $g.DrawString((U @(25945,32244,25490,31243,31649,29702,24460,21488)), $subFont, $stoneBrush, 86, 216)
    Fill-RoundedRectangle $g ([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 31, 61, 54))) 86 296 650 62 31
    $g.DrawString((U @(22266,23450,35506,32,124,32,21934,27425,20572,35506,32,124,32,25490,31243,27298,26597)), $pillFont, [System.Drawing.Brushes]::White, 118, 310)
    $g.DrawString("Coach operations", $eyebrowFont, $goldBrush, 90, 92)
    Draw-DashboardMark $g 746 178 1.0 $gold
  }

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Save-AppIcon($path, [int]$size) {
  $bmp = [System.Drawing.Bitmap]::new($size, $size)
  $g = New-Graphics $bmp
  $radius = $size * 0.18
  $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Rectangle]::new(0, 0, $size, $size),
    $deepGreen,
    [System.Drawing.ColorTranslator]::FromHtml("#2F5146"),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  Fill-RoundedRectangle $g $bgBrush 0 0 $size $size $radius

  $markPen = [System.Drawing.Pen]::new($warmWhite, [Math]::Max(9, $size * 0.052))
  $markPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $markPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $goldPen = [System.Drawing.Pen]::new($gold, [Math]::Max(6, $size * 0.034))
  $goldPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $goldPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $softPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(75, 247, 241, 232), [Math]::Max(3, $size * 0.016))

  $pad = $size * 0.23
  $left = $pad
  $top = $size * 0.24
  $bottom = $size * 0.72
  $mid = $size * 0.50
  $right = $size * 0.77
  $g.DrawLine($markPen, $left, $top, $left, $bottom)
  $g.DrawLine($markPen, $left, $bottom, $mid - $size * 0.05, $bottom)
  $g.DrawLine($goldPen, $mid - $size * 0.03, $bottom, $mid, $top + $size * 0.06)
  $g.DrawLine($goldPen, $mid, $top + $size * 0.06, $right, $bottom)
  $g.DrawLine($softPen, $size * 0.26, $size * 0.82, $size * 0.74, $size * 0.82)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

function Save-FaviconIco($pngPath, $icoPath) {
  $bitmap = [System.Drawing.Bitmap]::FromFile($pngPath)
  $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
  $stream = [System.IO.File]::Create($icoPath)
  $icon.Save($stream)
  $stream.Close()
  $icon.Dispose()
  $bitmap.Dispose()
}

Save-OgImage (Join-Path $ogDir "front-og.png") "front"
Save-OgImage (Join-Path $ogDir "coach-og.png") "coach"
Save-AppIcon (Join-Path $iconDir "icon-192.png") 192
Save-AppIcon (Join-Path $iconDir "icon-512.png") 512
Save-AppIcon (Join-Path $iconDir "apple-touch-icon.png") 180
Save-AppIcon (Join-Path $iconDir "maskable-icon-192.png") 192
Save-AppIcon (Join-Path $iconDir "maskable-icon-512.png") 512
Save-AppIcon (Join-Path $root "public\favicon.png") 64
Save-FaviconIco (Join-Path $root "public\favicon.png") (Join-Path $root "public\favicon.ico")
