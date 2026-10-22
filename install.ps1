# One-line installer for Windows: irm https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.ps1 | iex
# Downloads the latest installer and runs it silently: installs for this user (no admin) and starts Claude Pets.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue' # the progress bar makes Invoke-WebRequest crawl
$exe = Join-Path $env:TEMP 'ClaudePets-Setup.exe'
Invoke-WebRequest 'https://github.com/javiermiz/claude-pets/releases/latest/download/ClaudePets-Setup.exe' -OutFile $exe -UseBasicParsing
Start-Process $exe -ArgumentList '/S', '--force-run' -Wait
Remove-Item $exe
Write-Host 'Claude Pets installed. It lives in the notification area (the paw).'
