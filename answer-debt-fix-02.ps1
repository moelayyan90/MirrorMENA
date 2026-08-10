$ErrorActionPreference = "Stop"
$project = Join-Path $HOME "Desktop\answer-debt"
if (-not (Test-Path $project)) { throw "answer-debt project not found at $project" }
Set-Location $project

Write-Host "Applying Answer Debt type fixes..." -ForegroundColor Cyan

$sharedDir = Join-Path $project "src\shared"
New-Item -ItemType Directory -Path $sharedDir -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $sharedDir "placeholder.ts"), "export {};`n", [System.Text.UTF8Encoding]::new($false))

$clientGlobal = Join-Path $project "src\client\global.ts"
[System.IO.File]::WriteAllText($clientGlobal, "declare module '*.css';`n", [System.Text.UTF8Encoding]::new($false))

$triggersPath = Join-Path $project "src\server\routes\triggers.ts"
$triggers = @'
import { Hono } from 'hono';
import type { OnAppInstallRequest, OnCommentSubmitRequest, TriggerResponse } from '@devvit/web/shared';
import { redis, reddit } from '@devvit/web/server';
import { createHubPost } from '../core/hub';

const MIN_AGE_MS = 3 * 60 * 60 * 1000;
const RESCUE_MARK_TTL_SECONDS = 14 * 24 * 60 * 60;
const dayKey = () => new Date().toISOString().slice(0, 10);
const isPostId = (value: string): value is `t3_${string}` => value.startsWith('t3_');

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
    const postId = input.comment?.postId;
    if (!postId || !isPostId(postId)) {
      return c.json<TriggerResponse>({ status: 'success', message: 'No valid post ID' });
    }

    const post = await reddit.getPostById(postId);
    const ageMs = Date.now() - post.createdAt.getTime();

    if (post.numberOfComments !== 1 || ageMs < MIN_AGE_MS || post.stickied || post.nsfw || post.spam || post.removed) {
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
[System.IO.File]::WriteAllText($triggersPath, $triggers, [System.Text.UTF8Encoding]::new($false))

Write-Host "Type fixes applied." -ForegroundColor Green
Write-Host "Running TypeScript checks..." -ForegroundColor Cyan
npm run test:types
if ($LASTEXITCODE -ne 0) { throw "Type-check still failed. Send ChatGPT the last error screen." }

Write-Host "Running production build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed. Send ChatGPT the last error screen." }

Write-Host "Checks passed. Starting Reddit Devvit playtest..." -ForegroundColor Green
npm run dev
