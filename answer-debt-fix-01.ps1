$ErrorActionPreference = "Stop"
$project = Join-Path $HOME "Desktop\answer-debt"
if (-not (Test-Path $project)) { throw "answer-debt project not found at $project" }

function Write-Utf8File([string]$RelativePath, [string]$Content) {
  $full = Join-Path $project $RelativePath
  $parent = Split-Path $full -Parent
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [System.IO.File]::WriteAllText($full, $Content, [System.Text.UTF8Encoding]::new($false))
}

Write-Host "Fixing Answer Debt custom-post payload..." -ForegroundColor Cyan
Write-Utf8File 'src/server/core/hub.ts' @'
import { context, reddit } from '@devvit/web/server';

export const createHubPost = async () => {
  const subredditName = context.subredditName;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return reddit.submitCustomPost({
    subredditName,
    title: 'Answer Debt — rescue questions your community missed',
    entry: 'default',
    textFallback: {
      text: 'Answer Debt finds useful questions that aged without a reply and gives the community a simple rescue queue.',
    },
  });
};
'@

Set-Location $project
Write-Host "Running TypeScript type-check..." -ForegroundColor Cyan
npm run test:types
if ($LASTEXITCODE -ne 0) { throw "Type-check failed. Send ChatGPT a screenshot of the final error." }

Write-Host "Type-check passed. Starting Reddit Devvit playtest again..." -ForegroundColor Green
npm run dev