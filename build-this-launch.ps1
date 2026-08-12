$ErrorActionPreference = 'Stop'

$project = Join-Path $HOME 'Desktop\build-this'
$zip = Join-Path $env:TEMP 'build-this-final.zip'
$extract = Join-Path $env:TEMP 'build-this-final-src'
$archiveRoot = Join-Path $extract 'MirrorMENA-build-this-final\build-this'

Write-Host ''
Write-Host 'BUILD THIS — Reddit Devvit launcher' -ForegroundColor Cyan
Write-Host 'Downloading the CI-validated source...' -ForegroundColor Cyan

if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
if (Test-Path $project) { Remove-Item $project -Recurse -Force }

Invoke-WebRequest -UseBasicParsing 'https://github.com/moelayyan90/MirrorMENA/archive/refs/heads/build-this-final.zip' -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $extract -Force
Copy-Item -Path $archiveRoot -Destination $project -Recurse -Force
Set-Location $project

Write-Host 'Installing dependencies...' -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

Write-Host 'Running type checks...' -ForegroundColor Cyan
npm run test:types
if ($LASTEXITCODE -ne 0) { throw 'Type checking failed' }

Write-Host 'Running production build...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed' }

Write-Host 'Checking Reddit Devvit login...' -ForegroundColor Cyan
npx devvit whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Reddit login is required once. Complete the browser login, then return here.' -ForegroundColor Yellow
  npx devvit login
  if ($LASTEXITCODE -ne 0) { throw 'Devvit login did not complete' }
  npx devvit whoami
  if ($LASTEXITCODE -ne 0) { throw 'Devvit authentication could not be verified' }
}

Write-Host 'Uploading BUILD THIS to Reddit Developer Platform...' -ForegroundColor Cyan
Write-Host 'If Reddit asks to create the app, confirm it. Suggested description:' -ForegroundColor Yellow
Write-Host 'Turns real Reddit problems into ranked product demand that developers can claim, prototype, test, and ship.' -ForegroundColor White
Write-Host 'NSFW: No' -ForegroundColor White
npx devvit upload
if ($LASTEXITCODE -ne 0) { throw 'Devvit upload failed' }

Write-Host ''
Write-Host 'Starting playtest in r/answer_debt_dev...' -ForegroundColor Green
Write-Host 'Keep this PowerShell window open while testing. Press Ctrl+C when finished.' -ForegroundColor Yellow
Write-Host ''
npx devvit playtest answer_debt_dev
