$ErrorActionPreference = "Stop"
$project = Join-Path $HOME "Desktop\answer-debt"
if (-not (Test-Path $project)) { throw "answer-debt project not found at $project" }

function Write-Utf8File([string]$RelativePath, [string]$Content) {
  $full = Join-Path $project $RelativePath
  [System.IO.File]::WriteAllText($full, $Content, [System.Text.UTF8Encoding]::new($false))
}

Write-Utf8File 'src/server/routes/api.ts' @'
import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';

const MIN_AGE_HOURS = 0;
const MAX_AGE_HOURS = 24 * 7;
const MAX_QUEUE_ITEMS = 20;
const SCAN_LIMIT = 200;

const dayKey = () => new Date().toISOString().slice(0, 10);

export const api = new Hono();

api.get('/queue', async (c) => {
  const subredditName = context.subredditName;
  if (!subredditName) return c.json({ message: 'Missing subreddit context' }, 400);

  let posts = await reddit.getNewPosts({ subredditName, limit: SCAN_LIMIT, pageSize: 100 }).all();

  const ordinaryPosts = posts.filter(
    (post) => post.id !== context.postId && !post.title.startsWith('Answer Debt —')
  );

  if (subredditName.endsWith('_dev') && ordinaryPosts.length === 0) {
    await reddit.submitPost({
      subredditName,
      title: 'Test question: what small problem do you wish someone had answered sooner?',
      text: 'Playtest seed for Answer Debt. Leave this post with zero comments until it appears in the rescue queue.',
    });
    posts = await reddit.getNewPosts({ subredditName, limit: SCAN_LIMIT, pageSize: 100 }).all();
  }

  const now = Date.now();
  const minAgeMs = MIN_AGE_HOURS * 60 * 60 * 1000;
  const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000;

  const qualifying = posts
    .filter((post) => {
      const age = now - post.createdAt.getTime();
      return (
        post.id !== context.postId &&
        !post.title.startsWith('Answer Debt —') &&
        !post.stickied &&
        !post.locked &&
        !post.archived &&
        !post.removed &&
        !post.spam &&
        !post.nsfw &&
        post.numberOfComments === 0 &&
        age >= minAgeMs &&
        age <= maxAgeMs
      );
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const rescuedTodayRaw = await redis.get(`rescues:${dayKey()}`);
  const items = qualifying.slice(0, MAX_QUEUE_ITEMS).map((post) => ({
    id: post.id,
    title: post.title,
    permalink: post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`,
    ageHours: Math.max(0, Math.floor((now - post.createdAt.getTime()) / 3_600_000)),
  }));

  return c.json({
    subredditName,
    debt: qualifying.length,
    rescuedToday: rescuedTodayRaw ? Number.parseInt(rescuedTodayRaw, 10) : 0,
    minAgeHours: MIN_AGE_HOURS,
    items,
  });
});
'@

$triggerPath = Join-Path $project 'src/server/routes/triggers.ts'
$triggerText = Get-Content $triggerPath -Raw
$triggerText = $triggerText -replace 'const MIN_AGE_MS = 3 \* 60 \* 60 \* 1000;', 'const MIN_AGE_MS = 0;'
[System.IO.File]::WriteAllText($triggerPath, $triggerText, [System.Text.UTF8Encoding]::new($false))

Set-Location $project
Write-Host "Temporary playtest seed mode installed." -ForegroundColor Green
npm run test:types
if ($LASTEXITCODE -ne 0) { throw "Type-check failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }
Write-Host "Restarting Devvit playtest..." -ForegroundColor Green
npm run dev
