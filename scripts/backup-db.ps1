$Root = Split-Path -Parent $PSScriptRoot
$Db = Join-Path $Root "data\snow.db"
$BackupDir = Join-Path $Root "data\backups"

if (-not (Test-Path $Db)) {
    Write-Error "Database not found: $Db"
    exit 1
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$Dest = Join-Path $BackupDir "snow-$Stamp.db"

$sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
if ($sqlite3) {
    & sqlite3 $Db ".backup '$Dest'"
} else {
    Write-Host "sqlite3 not found — copying file (stop the backend first for a safe copy)."
    Copy-Item $Db $Dest
}

Write-Host "Backup saved: $Dest"
