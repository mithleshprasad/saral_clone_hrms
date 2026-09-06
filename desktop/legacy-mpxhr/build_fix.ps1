
$ErrorActionPreference = "Stop"

# Configuration
$CacheDir = Join-Path $PSScriptRoot ".cache"
$WinCodeSignVersion = "winCodeSign-2.6.0"
$WinCodeSignDir = Join-Path $CacheDir "winCodeSign"
$WinCodeSignUrl = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"
$SevenZipExe = Join-Path $PSScriptRoot "node_modules\7zip-bin\win\x64\7za.exe"

# Create Cache Directory
if (-not (Test-Path $WinCodeSignDir)) {
    Write-Host "Creating cache directory..."
    New-Item -ItemType Directory -Force -Path $WinCodeSignDir | Out-Null
}

$ArchivePath = Join-Path $WinCodeSignDir "$WinCodeSignVersion.7z"
$TargetDir = Join-Path $WinCodeSignDir $WinCodeSignVersion

if (-not (Test-Path $TargetDir)) {
    # Download
    Write-Host "Downloading winCodeSign..."
    Invoke-WebRequest -Uri $WinCodeSignUrl -OutFile $ArchivePath

    # Extract excluding darwin (macOS) folder which has symlinks
    Write-Host "Extracting winCodeSign (skipping macOS/linux files)..."
    $ArgList = @(
        "x",
        $ArchivePath,
        "-o$TargetDir",
        "-x!*/darwin",
        "-x!*/linux",
        "-y"
    )
    & $SevenZipExe $ArgList
    
    if ($LASTEXITCODE -ne 0) {
        # Check if we successfully extracted *something* and ignore the error if it was just symlinks
        if (Test-Path "$TargetDir\winCodeSign-2.6.0\win") {
            Write-Warning "Extraction had errors but 'win' folder exists. Proceeding..."
        }
        else {
            Write-Error "Extraction failed and 'win' folder missing."
        }
    }
}
else {
    Write-Host "winCodeSign already cached."
}

# Run Build with Custom Cache
Write-Host "Starting Build..."
$Env:ELECTRON_BUILDER_CACHE = $CacheDir
npm run dist
