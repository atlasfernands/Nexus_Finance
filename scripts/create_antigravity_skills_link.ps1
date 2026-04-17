# PowerShell script to create a Windows junction for the Antigravity global skills folder.
# It validates the destination path and lists contents after creation.
param(
    [string]$Origin = 'D:\1250 Skills\antigravity-awesome-skills-main\skills',
    [string]$Destination = "$env:USERPROFILE\.gemini\antigravity\skills",
    [switch]$Force
)

Write-Host "Origin: $Origin"
Write-Host "Destination: $Destination"

if (-not (Test-Path $Origin)) {
    Write-Error "Origin path does not exist: $Origin"
    exit 1
}

$destRoot = Split-Path $Destination -Parent
if (-not (Test-Path $destRoot)) {
    Write-Host "Creating destination root: $destRoot"
    New-Item -ItemType Directory -Path $destRoot | Out-Null
}

if (Test-Path $Destination) {
    $existing = Get-Item $Destination -ErrorAction SilentlyContinue
    if ($existing -and $existing.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Write-Host "Existing junction found at destination: $Destination"
        Write-Host "Target: $($existing.Target)"
        if ($Force) {
            Write-Host "Removing existing junction because -Force was provided."
            Remove-Item $Destination -Force
        } else {
            Write-Host "Use -Force to recreate the junction from the specified origin."
            goto Validate
        }
    } else {
        Write-Host "Destination exists but is not a junction."
        if ($Force) {
            Remove-Item $Destination -Recurse -Force
        } else {
            Write-Error "Destination already exists and is not a junction. Remove it manually or run with -Force."
            exit 1
        }
    }
}

Write-Host "Creating junction..."
cmd /c mklink /J `"$Destination`" `"$Origin`" | Write-Host

Validate:
if (-not (Test-Path $Destination)) {
    Write-Error "Failed to create junction at $Destination"
    exit 1
}

Write-Host "\nDestination contents:"
Get-ChildItem $Destination | Select-Object -First 40 | ForEach-Object { Write-Host $_.Name }

$testFile = Join-Path $Destination 'brainstorming\README.md'
if (Test-Path $testFile) {
    Write-Host "\nSample file found: $testFile"
    Write-Host "First lines:"
    Get-Content $testFile -TotalCount 10 | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "\nSample file not found: $testFile"
    Write-Host "You can validate any existing skill markdown file manually." 
}
