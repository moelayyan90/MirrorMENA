import { createHash, randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { context, createServer, getServerPort, redis, reddit } from '@devvit/web/server';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';

type Status = 'OPEN' | 'CLAIMED' | 'TESTING' | 'SHIPPED';
type RequestRecord = {
  id: string;
  title: string;
  problem: string;
  outcome: string;
  sourceUrl?: string;
  createdAt: string;
  createdBy: string;
  status: Status;
  builders: string[];
  builderKeys: string[];
  prototypeUrl?: string;
  hidden?: boolean;
};

const app = new Hono();
const INDEX = 'requests:index';
const HUB = 'hub:post';
const REPORT_HIDE_THRESHOLD = 5;
const RESTRICTED = /\b(gambling|betting|casino|sportsbook|crypto|bitcoin|ethereum|nft|token sale|stock trading|day trading|brokerage|investment advice|medical diagnosis|diagnose|prescription|medication advice|treatment plan|political campaign|election campaign|alcohol|vape|vaping|nicotine|cannabis|marijuana|recreational drug)\b/i;
const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'need', 'want', 'tool', 'app']);

const h = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 24);
const viewer = () => {
  if (!context.userId) throw new Error('Log in to Reddit to use this action.');
  return { key: h(context.userId), name: context.username || 'redditor' };
};
const clean = (value: unknown, max = 500) => String(value ?? '').trim().slice(0, max);
const readIndex = async () => {
  try {
    return JSON.parse((await redis.get(INDEX)) || '[]') as string[];
  } catch {
    return [];
  }
};
const writeIndex = (ids: string[]) => redis.set(INDEX, JSON.stringify(ids.slice(-500)));
const getReq = async (id: string) => {
  const value = await redis.get(`req:${id}`);
  return value ? (JSON.parse(value) as RequestRecord) : null;
};
const putReq = (record: RequestRecord) => redis.set(`req:${record.id}`, JSON.stringify(record));
const count = async (key: string) => Number.parseInt((await redis.get(key)) || '0', 10) || 0;
const tokens = (value: string) =>
  new Set(
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token))
  );
const similarity = (a: string, b: string) => {
  const first = tokens(a);
  const second = tokens(b);
  if (!first.size || !second.size) return 0;
  let overlap = 0;
  for (const token of first) if (second.has(token)) overlap++;
  return overlap / (first.size + second.size - overlap);
};
const ensureAllowed = (...parts: string[]) => {
  if (RESTRICTED.test(parts.join(' '))) {
    throw new Error('BUILD THIS does not accept requests in regulated or restricted categories.');
  }
};
const isRedditUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'reddit.com' || url.hostname.endsWith('.reddit.com'));
  } catch {
    return false;
  }
};

async function support(id: string) {
  const v = viewer();
  const record = await getReq(id);
  if (!record || record.hidden) throw new Error('Request is no longer available.');
  const key = `support:${id}:${v.key}`;
  if (await redis.get(key)) return false;
  await redis.set(key, '1');
  await redis.incrBy(`count:support:${id}`, 1);
  return true;
}

async function createOrMatch(input: { title: string; problem: string; outcome: string; sourceUrl?: string }) {
  const v = viewer();
  const title = clean(input.title, 120);
  const problem = clean(input.problem, 700);
  const outcome = clean(input.outcome, 500);
  const sourceUrl = clean(input.sourceUrl, 500);
  if (!title || !problem || !outcome) throw new Error('Title, problem, and successful outcome are required.');
  if (!sourceUrl || !isRedditUrl(sourceUrl)) throw new Error('Build requests must originate from a Reddit post.');
  ensureAllowed(title, problem, outcome);

  const ids = await readIndex();
  for (const id of ids.slice(-80).reverse()) {
    const record = await getReq(id);
    const sameSource = record?.sourceUrl === sourceUrl;
    const similarTitle = record ? similarity(record.title, title) >= 0.72 : false;
    if (
      record &&
      !record.hidden &&
      record.sourceUrl &&
      isRedditUrl(record.sourceUrl) &&
      record.status !== 'SHIPPED' &&
      (sameSource || similarTitle)
    ) {
      await support(record.id);
      return { record, matched: true };
    }
  }

  const record: RequestRecord = {
    id: randomUUID().slice(0, 12),
    title,
    problem,
    outcome,
    sourceUrl,
    createdAt: new Date().toISOString(),
    createdBy: v.name,
    status: 'OPEN',
    builders: [],
    builderKeys: [],
  };
  await putReq(record);
  ids.push(record.id);
  await writeIndex(ids);
  await support(record.id);
  return { record, matched: false };
}

async function hubPost() {
  const id = await redis.get(HUB);
  if (!id) return null;
  try {
    return await reddit.getPostById(id as `t3_${string}`);
  } catch {
    return null;
  }
}

async function createHub() {
  if (!context.subredditName) throw new Error('Missing subreddit context');
  const existing = await hubPost();
  if (existing) return existing;

  const post = await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: 'BUILD THIS — what should the internet build next?',
    entry: 'default',
    textFallback: {
      text: 'Turn real Reddit problems into ranked demand, then connect them with developers who can build and testers who asked for the solution.',
    },
  });
  await redis.set(HUB, post.id);
  return post;
}

app.get('/api/feed', async (c) => {
  const ids = (await readIndex()).slice(-120);
  const currentViewer = context.userId ? { key: h(context.userId) } : null;
  const items = (
    await Promise.all(
      ids.map(async (id) => {
        const record = await getReq(id);
        if (!record || record.hidden || !record.sourceUrl || !isRedditUrl(record.sourceUrl)) return null;
        const [supporters, testers, works, needsWork, viewerSupported, viewerTester] = await Promise.all([
          count(`count:support:${id}`),
          count(`count:tester:${id}`),
          count(`count:works:${id}`),
          count(`count:needs:${id}`),
          currentViewer ? redis.get(`support:${id}:${currentViewer.key}`) : null,
          currentViewer ? redis.get(`tester:${id}:${currentViewer.key}`) : null,
        ]);
        return {
          ...record,
          supporters,
          testers,
          works,
          needsWork,
          viewerSupported: Boolean(viewerSupported),
          viewerTester: Boolean(viewerTester),
          viewerBuilder: Boolean(currentViewer && record.builderKeys.includes(currentViewer.key)),
        };
      })
    )
  ).filter(Boolean) as any[];

  items.sort((a, b) => {
    if (a.status === 'SHIPPED' && b.status !== 'SHIPPED') return 1;
    if (b.status === 'SHIPPED' && a.status !== 'SHIPPED') return -1;
    return b.supporters - a.supporters || Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return c.json({
    subredditName: context.subredditName || 'community',
    open: items.filter((item) => item.status !== 'SHIPPED').length,
    shipped: items.filter((item) => item.status === 'SHIPPED').length,
    items,
  });
});

app.post('/api/requests', async (c) => {
  return c.json({ message: 'Create a normal Reddit post first, then use its ••• menu → BUILD THIS.' }, 410);
});

app.post('/api/requests/:id/support', async (c) => {
  try {
    return c.json({ added: await support(c.req.param('id')) });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Could not support' }, 400);
  }
});

app.post('/api/requests/:id/tester', async (c) => {
  try {
    const v = viewer();
    const id = c.req.param('id');
    const record = await getReq(id);
    if (!record || record.hidden) return c.json({ message: 'Request not found' }, 404);
    const key = `tester:${id}:${v.key}`;
    if (!(await redis.get(key))) {
      await redis.set(key, '1');
      await redis.incrBy(`count:tester:${id}`, 1);
    }
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Could not join beta' }, 400);
  }
});

app.post('/api/requests/:id/claim', async (c) => {
  try {
    const v = viewer();
    const id = c.req.param('id');
    const record = await getReq(id);
    if (!record || record.hidden) return c.json({ message: 'Request not found' }, 404);
    if (record.status === 'SHIPPED') return c.json({ message: 'This request is already shipped.' }, 409);
    if (!record.builderKeys.includes(v.key)) {
      if (record.builders.length >= 3) return c.json({ message: 'This build already has three active builders.' }, 409);
      record.builders.push(v.name);
      record.builderKeys.push(v.key);
      if (record.status === 'OPEN') record.status = 'CLAIMED';
      await putReq(record);
    }
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Could not claim' }, 400);
  }
});

app.post('/api/requests/:id/prototype', async (c) => {
  try {
    const v = viewer();
    const id = c.req.param('id');
    const record = await getReq(id);
    if (!record || record.hidden) return c.json({ message: 'Request not found' }, 404);
    if (!record.builderKeys.includes(v.key)) return c.json({ message: 'Only a claimed builder can attach proof.' }, 403);
    const body = await c.req.json<any>();
    const url = clean(body.url, 500);
    if (!isRedditUrl(url)) {
      return c.json({ message: 'Use a Reddit URL showing the proof: reddit.com or developers.reddit.com.' }, 400);
    }
    record.prototypeUrl = url;
    record.status = 'TESTING';
    await putReq(record);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Could not add proof' }, 400);
  }
});

app.post('/api/requests/:id/vote', async (c) => {
  try {
    const v = viewer();
    const id = c.req.param('id');
    const record = await getReq(id);
    if (!record || record.hidden || !record.prototypeUrl) return c.json({ message: 'No proof is ready to test.' }, 409);
    const body = await c.req.json<any>();
    const vote = body.vote === 'works' ? 'works' : body.vote === 'needs-work' ? 'needs' : null;
    if (!vote) return c.json({ message: 'Invalid test result.' }, 400);
    const key = `vote:${id}:${v.key}`;
    if (await redis.get(key)) return c.json({ ok: true, duplicate: true });
    await redis.set(key, vote);
    await redis.incrBy(vote === 'works' ? `count:works:${id}` : `count:needs:${id}`, 1);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Could not record test' }, 400);
  }
});

app.post('/api/requests/:id/ship', async (c) => {
  try {
    const v = viewer();
    const id = c.req.param('id');
    const record = await getReq(id);
    if (!record || record.hidden) return c.json({ message: 'Request not found' }, 404);
    if (!record.builderKeys.includes(v.key)) return c.json({ message: 'Only a claimed builder can mark this shipped.' }, 403);
    if (!record.prototypeUrl) return c.json({ message: 'Attach Reddit-native proof first.' }, 409);
    record.status = 'SHIPPED';
    await putReq(record);
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Could not ship' }, 400);
  }
});

app.post('/api/requests/:id/report', async (c) => {
  try {
    const v = viewer();
    const id = c.req.param('id');
    const record = await getReq(id);
    if (!record || record.hidden) return c.json({ message: 'Request not found' }, 404);
    const key = `report:${id}:${v.key}`;
    if (await redis.get(key)) return c.json({ ok: true, duplicate: true });
    await redis.set(key, '1');
    const reports = await redis.incrBy(`count:report:${id}`, 1);
    if (reports >= REPORT_HIDE_THRESHOLD) {
      record.hidden = true;
      await putReq(record);
    }
    return c.json({ ok: true, hidden: Boolean(record.hidden) });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Could not report request' }, 400);
  }
});

app.post('/internal/menu/build-this', async (c) => {
  try {
    await c.req.json().catch(() => ({}));
    if (!context.postId) return c.json({ showToast: 'Open the menu from a Reddit post.' });
    const post = await reddit.getPostById(context.postId);
    if (post.nsfw) return c.json({ showToast: 'NSFW posts cannot become BUILD THIS requests.' });
    const sourceUrl = post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`;
    const output = await createOrMatch({
      title: post.title,
      problem: `People in r/${context.subredditName || 'this community'} surfaced this need: ${post.title}`,
      outcome: 'A usable solution that directly resolves the need described in the source post.',
      sourceUrl,
    });
    const hub = await hubPost();
    return c.json(
      hub
        ? {
            showToast: output.matched ? 'Matched existing demand. Your vote was added.' : 'Build request created from this reportable Reddit post.',
            navigateTo: hub,
          }
        : {
            showToast: output.matched ? 'Matched existing demand.' : 'Build request created from this Reddit post. Open the BUILD THIS hub.',
          }
    );
  } catch (error) {
    return c.json({ showToast: error instanceof Error ? error.message : 'Could not create build request.' });
  }
});

app.post('/internal/menu/create-hub', async (c) => {
  try {
    await c.req.json().catch(() => ({}));
    const post = await createHub();
    return c.json({ showToast: 'BUILD THIS hub ready.', navigateTo: post });
  } catch (error) {
    return c.json({ showToast: error instanceof Error ? error.message : 'Could not create hub.' });
  }
});

app.post('/internal/triggers/app-install', async (c) => {
  try {
    await c.req.json<OnAppInstallRequest>();
    await createHub();
    return c.json<TriggerResponse>({ status: 'success', message: 'BUILD THIS hub ready' });
  } catch (error) {
    console.error(error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Hub creation failed' }, 400);
  }
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
