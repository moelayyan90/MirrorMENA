$ErrorActionPreference = 'Stop'

$project = Join-Path $HOME 'Desktop\build-this'
if (-not (Test-Path $project)) {
  throw 'BUILD THIS project was not found on Desktop. Run build-this-launch.ps1 first.'
}

Set-Location $project

Write-Host 'Verifying BUILD THIS before public review...' -ForegroundColor Cyan
npm run test:types
if ($LASTEXITCODE -ne 0) { throw 'Type checking failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed' }

npx devvit whoami
if ($LASTEXITCODE -ne 0) {
  npx devvit login
  if ($LASTEXITCODE -ne 0) { throw 'Devvit login failed' }
}

Write-Host 'Submitting BUILD THIS for public App Directory review...' -ForegroundColor Yellow
Write-Host 'If Reddit asks to attach the source bundle for review, choose Continue.' -ForegroundColor Yellow
npx devvit publish --public
if ($LASTEXITCODE -ne 0) { throw 'Reddit publish did not complete successfully' }

Write-Host 'BUILD THIS has been submitted for public review.' -ForegroundColor Green
