param(
    [Parameter(Mandatory = $true)]
    [string]$Backup
)

$Root = Split-Path -Parent $PSScriptRoot
$Db = Join-Path $Root "data\snow.db"
$BackupDir = Join-Path $Root "data\backups"

$Source = $Backup
if (-not (Test-Path $Source)) {
    $Source = Join-Path $BackupDir $Backup
}

if (-not (Test-Path $Source)) {
    Write-Error "Backup not found: $Source"
    exit 1
}

Write-Host "This will overwrite $Db with:"
Write-Host "  $Source"
Write-Host "Stop the backend first: docker compose stop backend"
$Confirm = Read-Host "Type RESTORE to continue"

if ($Confirm -ne "RESTORE") {
    Write-Host "Aborted."
    exit 0
}

New-Item -ItemType Directory -Force -Path (Split-Path $Db) | Out-Null
Copy-Item $Source $Db -Force
Write-Host "Database restored from $Source"
