Add-Type -AssemblyName System.Drawing

$w = 240; $h = 160; $fps = 15
$colors = @(
    [System.Drawing.Color]::White,
    [System.Drawing.Color]::Red,
    [System.Drawing.Color]::Lime,
    [System.Drawing.Color]::Blue
)
$hold = 8
$jpgs = @()
foreach ($c in $colors) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear($c); $g.Dispose()
    $ms = New-Object IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $bmp.Dispose()
    $jpg = $ms.ToArray(); $ms.Dispose()
    for ($k = 0; $k -lt $hold; $k++) { $jpgs += ,$jpg }
}
$n = $jpgs.Count
$jpgLen = $jpgs[0].Length
$us = [int](1000000 / $fps)

function New-Buf { $b = New-Object 'System.Collections.Generic.List[byte]'; Write-Output -NoEnumerate $b }
function Add-Bytes($buf, [byte[]]$b) { foreach ($x in $b) { $buf.Add($x) } }
function Add-U32($buf, [uint32]$v) { Add-Bytes $buf ([BitConverter]::GetBytes([uint32]$v)) }
function Add-U16($buf, [uint16]$v) { Add-Bytes $buf ([BitConverter]::GetBytes([uint16]$v)) }
function Add-Ascii($buf, [string]$s) { Add-Bytes $buf ([Text.Encoding]::ASCII.GetBytes($s)) }
function Add-Chunk($buf, [string]$id, $data) {
    Add-Ascii $buf $id
    Add-U32 $buf ([uint32]$data.Count)
    Add-Bytes $buf $data.ToArray()
    if (($data.Count % 2) -ne 0) { $buf.Add([byte]0) }
}
function Add-List($buf, [string]$type, $data) {
    Add-Ascii $buf 'LIST'
    Add-U32 $buf ([uint32]($data.Count + 4))
    Add-Ascii $buf $type
    Add-Bytes $buf $data.ToArray()
    if ((($data.Count + 4) % 2) -ne 0) { $buf.Add([byte]0) }
}

$avih = New-Buf
Add-U32 $avih $us
Add-U32 $avih ($jpgLen * $fps)
Add-U32 $avih 0
Add-U32 $avih 0x10
Add-U32 $avih $n
Add-U32 $avih 0
Add-U32 $avih 1
Add-U32 $avih $jpgLen
Add-U32 $avih $w
Add-U32 $avih $h
1..4 | ForEach-Object { Add-U32 $avih 0 }

$strh = New-Buf
Add-Ascii $strh 'vids'
Add-Ascii $strh 'MJPG'
Add-U32 $strh 0
Add-U16 $strh 0
Add-U16 $strh 0
Add-U32 $strh 0
Add-U32 $strh 1
Add-U32 $strh $fps
Add-U32 $strh 0
Add-U32 $strh $n
Add-U32 $strh $jpgLen
Add-U32 $strh ([uint32]::MaxValue)
Add-U32 $strh 0
Add-U16 $strh 0
Add-U16 $strh 0
Add-U16 $strh $w
Add-U16 $strh $h

$strf = New-Buf
Add-U32 $strf 40
Add-U32 $strf $w
Add-U32 $strf $h
Add-U16 $strf 1
Add-U16 $strf 24
Add-Ascii $strf 'MJPG'
Add-U32 $strf $jpgLen
Add-U32 $strf 0
Add-U32 $strf 0
Add-U32 $strf 0
Add-U32 $strf 0

$strl = New-Buf
Add-Chunk $strl 'strh' $strh
Add-Chunk $strl 'strf' $strf

$hdrl = New-Buf
Add-Chunk $hdrl 'avih' $avih
Add-List $hdrl 'strl' $strl

$movi = New-Buf
$offs = @()
for ($i = 0; $i -lt $n; $i++) {
    $offs += ,(4 + $movi.Count)
    $one = New-Buf
    Add-Bytes $one $jpgs[$i]
    Add-Chunk $movi '00dc' $one
}

$idx = New-Buf
for ($i = 0; $i -lt $n; $i++) {
    Add-Ascii $idx '00dc'
    Add-U32 $idx 0x10
    Add-U32 $idx $offs[$i]
    Add-U32 $idx $jpgLen
}

$body = New-Buf
Add-List $body 'hdrl' $hdrl
Add-List $body 'movi' $movi
Add-Chunk $body 'idx1' $idx

$out = New-Buf
Add-Ascii $out 'RIFF'
Add-U32 $out ([uint32]($body.Count + 4))
Add-Ascii $out 'AVI '
Add-Bytes $out $body.ToArray()

$path = 'D:\TOHRAN PROJECT\test_solid_white_red_green_blue.avi'
[IO.File]::WriteAllBytes($path, $out.ToArray())
"wrote $path  bytes=$($out.Count)  frames=$n  jpeg=$jpgLen"
