$ErrorActionPreference = "Stop"
$project = Join-Path $HOME "Desktop\answer-debt"
if (-not (Test-Path $project)) { throw "answer-debt project not found at $project" }

function Write-Utf8File([string]$RelativePath, [string]$Content) {
  $full = Join-Path $project $RelativePath
  $parent = Split-Path $full -Parent
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  [System.IO.File]::WriteAllText($full, $Content, [System.Text.UTF8Encoding]::new($false))
}

Write-Host "Preparing Answer Debt production build..." -ForegroundColor Cyan

Write-Utf8File 'src/server/routes/api.ts' @'
import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';

const MIN_AGE_HOURS = 3;
const MAX_AGE_HOURS = 24 * 7;
const MAX_QUEUE_ITEMS = 20;
const SCAN_LIMIT = 1000;

const dayKey = () => new Date().toISOString().slice(0, 10);

export const api = new Hono();

api.get('/queue', async (c) => {
  const subredditName = context.subredditName;
  if (!subredditName) return c.json({ message: 'Missing subreddit context' }, 400);

  const posts = await reddit.getNewPosts({
    subredditName,
    limit: SCAN_LIMIT,
    pageSize: 100,
  }).all();

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
    ageHours: Math.max(1, Math.floor((now - post.createdAt.getTime()) / 3_600_000)),
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

Write-Utf8File 'src/server/routes/triggers.ts' @'
import { Hono } from 'hono';
import type { OnAppInstallRequest, OnCommentSubmitRequest, TriggerResponse } from '@devvit/web/shared';
import { redis, reddit } from '@devvit/web/server';
import { createHubPost } from '../core/hub';

const MIN_AGE_MS = 3 * 60 * 60 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const RESCUE_MARK_TTL_SECONDS = 14 * 24 * 60 * 60;
const dayKey = () => new Date().toISOString().slice(0, 10);

export const triggers = new Hono();

triggers.post('/app-install', async (c) => {
  try {
    await c.req.json<OnAppInstallRequest>();
    await createHubPost();
    return c.json<TriggerResponse>({ status: 'success', message: 'Answer Debt hub created' });
  } catch (error) {
    console.error('Install trigger failed:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Hub creation failed' }, 400);
  }
});

triggers.post('/comment-submit', async (c) => {
  try {
    const input = await c.req.json<OnCommentSubmitRequest>();
    const rawPostId = input.comment?.postId;
    if (!rawPostId || !rawPostId.startsWith('t3_')) {
      return c.json<TriggerResponse>({ status: 'success', message: 'No valid post ID' });
    }

    const postId = rawPostId as `t3_${string}`;
    const post = await reddit.getPostById(postId);
    const ageMs = Date.now() - post.createdAt.getTime();

    if (
      post.numberOfComments !== 1 ||
      ageMs < MIN_AGE_MS ||
      ageMs > MAX_AGE_MS ||
      post.stickied ||
      post.nsfw ||
      post.spam ||
      post.removed
    ) {
      return c.json<TriggerResponse>({ status: 'success', message: 'Not a rescue event' });
    }

    const rescueKey = `rescued:${post.id}`;
    if (await redis.get(rescueKey)) {
      return c.json<TriggerResponse>({ status: 'success', message: 'Already counted' });
    }

    await redis.set(rescueKey, '1');
    await redis.expire(rescueKey, RESCUE_MARK_TTL_SECONDS);
    await redis.incrBy(`rescues:${dayKey()}`, 1);
    await redis.expire(`rescues:${dayKey()}`, RESCUE_MARK_TTL_SECONDS);

    return c.json<TriggerResponse>({ status: 'success', message: 'Rescue counted' });
  } catch (error) {
    console.error('Comment trigger failed:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Comment trigger failed' }, 400);
  }
});
'@

Write-Utf8File 'README.md' @'
# Answer Debt

Answer Debt is a Reddit community utility that surfaces recent posts which have aged without receiving any comments, giving community members a simple queue of questions they can rescue.

## What it does

- Scans up to the newest 1,000 posts in the installed subreddit.
- Treats a post as answer debt when it is between 3 hours and 7 days old and still has zero comments.
- Excludes sticky, locked, archived, removed, spam, and NSFW posts.
- Sorts the rescue queue oldest-first and shows up to 20 actionable items.
- Counts a rescue when an eligible aged post receives its first comment.
- Creates an Answer Debt hub custom post when the app is installed.

## Data and privacy

Answer Debt does not store responder usernames, user IDs, comment bodies, or private user data. Redis stores only temporary post-level rescue markers to prevent duplicate counting and a daily aggregate rescue count. Rescue markers expire automatically.

The app does not use external fetch domains, LLMs, payments, advertising, or third-party analytics.

## Moderator usage

Install the app in a subreddit. The app creates an Answer Debt hub post. Moderators can also use the subreddit menu action **Create Answer Debt hub** to create another hub post if needed.

Community members open the hub, select an unanswered post from the queue, and answer it normally on Reddit.

## Permissions

Answer Debt uses Reddit API access to read subreddit posts, create its hub post, and react to comment-submit events. It uses Devvit Redis for temporary deduplication and aggregate rescue counts.

## Testing

The core rescue flow has been playtested in `r/answer_debt_dev`: an unanswered post appeared in the queue, the first comment removed it from the queue, and the daily rescue counter incremented exactly once.

## Support

Developer contact: u/Born-Part-519 on Reddit.
'@

Set-Location $project

Write-Host "Running type-check..." -ForegroundColor Cyan
npm run test:types
if ($LASTEXITCODE -ne 0) { throw "Type-check failed" }

Write-Host "Running production build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "Production checks passed." -ForegroundColor Green
Write-Host "Submitting Answer Debt as a PUBLIC app for Reddit review..." -ForegroundColor Yellow
Write-Host "If Reddit asks a confirmation question, answer it in this terminal." -ForegroundColor Yellow

npx devvit publish --public
if ($LASTEXITCODE -ne 0) { throw "Reddit publish did not complete successfully" }

Write-Host "Answer Debt was submitted to Reddit review." -ForegroundColor Green
