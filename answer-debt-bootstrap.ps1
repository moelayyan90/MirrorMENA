$ErrorActionPreference = "Stop"

$project = Join-Path $HOME "Desktop\answer-debt"
if (-not (Test-Path $project)) {
  throw "answer-debt project was not found at $project"
}

Write-Host ""
Write-Host "Installing Answer Debt into the Reddit Devvit project..." -ForegroundColor Cyan

$srcPath = Join-Path $project "src"
if (Test-Path $srcPath) {
  Remove-Item $srcPath -Recurse -Force
}

function Write-Utf8File([string]$RelativePath, [string]$Content) {
  $full = Join-Path $project $RelativePath
  $parent = Split-Path $full -Parent
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  [System.IO.File]::WriteAllText($full, $Content, [System.Text.UTF8Encoding]::new($false))
}

# devvit.json
Write-Utf8File 'devvit.json' @'
{
  "$schema": "https://developers.reddit.com/schema/config-file.v1.json",
  "name": "answer-debt",
  "post": {
    "dir": "dist/client",
    "entrypoints": {
      "default": {
        "inline": true,
        "entry": "splash.html"
      },
      "app": {
        "entry": "app.html"
      }
    }
  },
  "server": {
    "dir": "dist/server",
    "entry": "index.cjs"
  },
  "permissions": {
    "reddit": true,
    "redis": true
  },
  "menu": {
    "items": [
      {
        "label": "Create Answer Debt hub",
        "description": "Create the community rescue queue post",
        "location": "subreddit",
        "forUserType": "moderator",
        "endpoint": "/internal/menu/create-hub"
      }
    ]
  },
  "triggers": {
    "onAppInstall": "/internal/triggers/app-install",
    "onCommentSubmit": "/internal/triggers/comment-submit"
  },
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build"
  }
}
'@

# src/client/app.html
Write-Utf8File 'src/client/app.html' @'
<!doctype html>
<html lang="en" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Answer Debt</title>
  </head>
  <body class="h-full">
    <div id="root" class="h-full"></div>
    <script type="module" src="app.tsx"></script>
  </body>
</html>
'@

# src/client/app.tsx
Write-Utf8File 'src/client/app.tsx' @'
import './styles.css';
import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';

type QueueItem = {
  id: string;
  title: string;
  permalink: string;
  ageHours: number;
};

type QueueResponse = {
  subredditName: string;
  debt: number;
  rescuedToday: number;
  minAgeHours: number;
  items: QueueItem[];
};

const App = () => {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/queue');
      if (!response.ok) throw new Error(`Queue request failed (${response.status})`);
      const payload = (await response.json()) as QueueResponse;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the rescue queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <div className="loading">Measuring answer debt…</div>;

  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">r/{data?.subredditName ?? 'community'} · live backlog</div>
        <h1>Answer Debt</h1>
        <p>Questions older than {data?.minAgeHours ?? 3} hours with zero comments become debt. Open one and be the first useful human to answer it.</p>
      </section>

      <section className="stats">
        <div className="stat"><strong>{data?.debt ?? 0}</strong><span>unanswered posts in the current rescue window</span></div>
        <div className="stat"><strong>{data?.rescuedToday ?? 0}</strong><span>aged zero-reply posts rescued today</span></div>
      </section>

      <div className="toolbar">
        <h2>Oldest debt first</h2>
        <button className="refresh" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <section className="queue">
        {data?.items.map((item) => (
          <article className="card" key={item.id}>
            <div className="meta"><span>{item.ageHours}h unanswered</span><span className="dot"/><span>0 comments</span></div>
            <h3 className="title">{item.title}</h3>
            <button className="rescue" onClick={() => navigateTo(item.permalink)}>Rescue this question</button>
          </article>
        ))}
        {data && data.items.length === 0 ? (
          <div className="empty"><strong>Debt cleared.</strong><div className="small">No qualifying zero-reply posts are waiting right now. Come back as new questions age into the rescue window.</div></div>
        ) : null}
      </section>

      <p className="small" style={{ margin: '18px 4px' }}>
        Answer Debt stores no responder identity. A rescue is counted only when an aged post receives its first comment; only the post ID is temporarily marked to prevent duplicate counting.
      </p>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
'@

# src/client/splash.html
Write-Utf8File 'src/client/splash.html' @'
<!doctype html>
<html lang="en" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Answer Debt</title>
  </head>
  <body class="h-full">
    <div id="root" class="h-full"></div>
    <script type="module" src="splash.tsx"></script>
  </body>
</html>
'@

# src/client/splash.tsx
Write-Utf8File 'src/client/splash.tsx' @'
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';

const Splash = () => (
  <main className="splash">
    <section className="splash-card">
      <span className="splash-mark">0?</span>
      <div className="kicker" style={{ marginTop: 16 }}>Community rescue queue</div>
      <h1>How much answer debt does this community have?</h1>
      <p style={{ color: '#c7c7c7', lineHeight: 1.5 }}>
        Find useful questions that slipped through with zero replies, rescue one, and help clear the backlog.
      </p>
      <button className="start" onClick={(event) => requestExpandedMode(event.nativeEvent, 'app')}>
        Open Answer Debt
      </button>
    </section>
  </main>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
'@

# src/client/styles.css
Write-Utf8File 'src/client/styles.css' @'
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #171717;
  background: #f6f7f8;
  font-synthesis: none;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 100%; min-height: 100vh; background: #f6f7f8; }
button { font: inherit; }
.shell { min-height: 100vh; padding: 18px; }
.hero { background: #151515; color: white; border-radius: 22px; padding: 22px; overflow: hidden; position: relative; }
.hero::after { content: ""; position: absolute; width: 190px; height: 190px; border-radius: 999px; right: -70px; top: -80px; background: #ff4500; opacity: .95; }
.kicker { text-transform: uppercase; letter-spacing: .13em; font-weight: 800; font-size: 11px; opacity: .72; }
h1 { margin: 7px 0 4px; font-size: clamp(30px, 8vw, 46px); line-height: .96; max-width: 540px; position: relative; z-index: 1; }
.hero p { margin: 10px 0 0; max-width: 620px; color: #d5d5d5; line-height: 1.45; position: relative; z-index: 1; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin: 14px 0; }
.stat { background: white; border: 1px solid #e2e4e6; border-radius: 18px; padding: 16px; }
.stat strong { display: block; font-size: 28px; }
.stat span { color: #5c6268; font-size: 12px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 18px 2px 10px; }
.toolbar h2 { font-size: 18px; margin: 0; }
.refresh { border: 0; background: #e6e8ea; border-radius: 999px; padding: 9px 13px; cursor: pointer; font-weight: 700; }
.queue { display: grid; gap: 10px; }
.card { background: white; border: 1px solid #e2e4e6; border-radius: 18px; padding: 16px; }
.meta { display: flex; gap: 8px; align-items: center; color: #687078; font-size: 12px; margin-bottom: 8px; }
.dot { width: 4px; height: 4px; background: #a9adb1; border-radius: 50%; }
.title { margin: 0; font-size: 16px; line-height: 1.35; }
.rescue { margin-top: 14px; width: 100%; border: 0; color: white; background: #ff4500; border-radius: 999px; padding: 12px 16px; font-weight: 800; cursor: pointer; }
.empty { text-align: center; padding: 42px 20px; background: white; border: 1px solid #e2e4e6; border-radius: 18px; }
.empty strong { display: block; font-size: 22px; margin-bottom: 5px; }
.small { color: #697079; font-size: 12px; line-height: 1.5; }
.loading { padding: 42px 0; text-align: center; color: #666; }
.error { background: #fff2ed; color: #842d0b; padding: 14px; border-radius: 14px; }
.splash { min-height: 100vh; display: grid; place-items: center; padding: 18px; background: #151515; color: white; }
.splash-card { width: min(640px,100%); background: #202020; border: 1px solid #343434; border-radius: 24px; padding: 24px; }
.splash-mark { display: inline-grid; place-items: center; width: 48px; height: 48px; border-radius: 15px; background: #ff4500; font-weight: 900; font-size: 22px; }
.splash h1 { margin-top: 18px; }
.start { margin-top: 18px; width: 100%; border: 0; border-radius: 999px; padding: 13px 16px; background: white; color: #111; font-weight: 900; cursor: pointer; }
@media (min-width: 720px) { .shell { max-width: 820px; margin: 0 auto; padding: 28px; } .stats { grid-template-columns: 1fr 1fr; } }
'@

# src/server/core/hub.ts
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
    textFallback: 'Answer Debt finds useful questions that aged without a reply and gives the community a simple rescue queue.',
  });
};
'@

# src/server/index.ts
Write-Utf8File 'src/server/index.ts' @'
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';

const app = new Hono();
const internal = new Hono();

app.route('/api', api);
internal.route('/menu', menu);
internal.route('/triggers', triggers);
app.route('/internal', internal);

serve({ fetch: app.fetch, createServer, port: getServerPort() });
'@

# src/server/routes/api.ts
Write-Utf8File 'src/server/routes/api.ts' @'
import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';

const MIN_AGE_HOURS = 3;
const MAX_AGE_HOURS = 24 * 7;
const MAX_QUEUE_ITEMS = 20;
const SCAN_LIMIT = 200;

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

# src/server/routes/menu.ts
Write-Utf8File 'src/server/routes/menu.ts' @'
import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createHubPost } from '../core/hub';

export const menu = new Hono();

menu.post('/create-hub', async (c) => {
  try {
    const post = await createHubPost();
    return c.json<UiResponse>({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id.replace('t3_', '')}`,
    });
  } catch (error) {
    console.error('Create hub failed:', error);
    return c.json<UiResponse>({ showToast: 'Could not create Answer Debt hub' }, 400);
  }
});
'@

# src/server/routes/triggers.ts
Write-Utf8File 'src/server/routes/triggers.ts' @'
import { Hono } from 'hono';
import type { OnAppInstallRequest, OnCommentSubmitRequest, TriggerResponse } from '@devvit/web/shared';
import { redis, reddit } from '@devvit/web/server';
import { createHubPost } from '../core/hub';

const MIN_AGE_MS = 3 * 60 * 60 * 1000;
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
    const postId = input.comment?.postId;
    if (!postId) return c.json<TriggerResponse>({ status: 'success', message: 'No post ID' });

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

Write-Host "Answer Debt source installed." -ForegroundColor Green
Set-Location $project

Write-Host ""
Write-Host "Checking the build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  throw "Build failed. Leave this window open and send ChatGPT a screenshot of the final error."
}

Write-Host ""
Write-Host "Build passed. Starting Reddit Devvit playtest..." -ForegroundColor Green
npm run dev
