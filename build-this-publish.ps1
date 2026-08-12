$ErrorActionPreference = 'Stop'

$project = Join-Path $HOME 'Desktop\build-this'
$zip = Join-Path $env:TEMP 'build-this-review-fix.zip'
$extract = Join-Path $env:TEMP 'build-this-review-fix-src'
$archiveRoot = Join-Path $extract 'MirrorMENA-build-this-final\build-this'

Write-Host 'Refreshing the latest BUILD THIS review-fix source...' -ForegroundColor Cyan
if (Test-Path $zip) { Remove-Item $zip -Force }
if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }

Invoke-WebRequest -UseBasicParsing 'https://github.com/moelayyan90/MirrorMENA/archive/refs/heads/build-this-final.zip' -OutFile $zip
Expand-Archive -Path $zip -DestinationPath $extract -Force

if (Test-Path $project) { Remove-Item $project -Recurse -Force }
Copy-Item -Path $archiveRoot -Destination $project -Recurse -Force
Set-Location $project

Write-Host 'Installing and verifying BUILD THIS...' -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
npm run test:types
if ($LASTEXITCODE -ne 0) { throw 'Type checking failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed' }

npx devvit whoami
if ($LASTEXITCODE -ne 0) {
  npx devvit login
  if ($LASTEXITCODE -ne 0) { throw 'Devvit login failed' }
}

Write-Host 'Submitting the UGC-compliance fix for public App Directory review...' -ForegroundColor Yellow
Write-Host 'If Reddit asks to attach the source bundle for review, choose Continue.' -ForegroundColor Yellow
npx devvit publish --public
if ($LASTEXITCODE -ne 0) { throw 'Reddit publish did not complete successfully' }

Write-Host 'BUILD THIS review fix has been submitted.' -ForegroundColor Green
