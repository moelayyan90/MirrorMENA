import './styles.css';
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { navigateTo, showForm, showToast } from '@devvit/web/client';

type Status = 'OPEN' | 'CLAIMED' | 'TESTING' | 'SHIPPED';
type Item = {
  id: string;
  title: string;
  problem: string;
  outcome: string;
  sourceUrl?: string;
  createdAt: string;
  createdBy: string;
  status: Status;
  builders: string[];
  prototypeUrl?: string;
  supporters: number;
  testers: number;
  works: number;
  needsWork: number;
  viewerSupported: boolean;
  viewerTester: boolean;
  viewerBuilder: boolean;
};
type Feed = { subredditName: string; open: number; shipped: number; items: Item[] };

async function api(path: string, body?: unknown) {
  const init: RequestInit = body === undefined
    ? { method: 'GET' }
    : {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      };
  const response = await fetch(path, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload;
}

function App() {
  const [data, setData] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | Status>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api('/api/feed'));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not load market');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(
    () => data?.items.filter((item) => filter === 'ALL' || item.status === filter) ?? [],
    [data, filter]
  );

  const createRequest = async () => {
    const result = await showForm({
      title: 'Create a build request',
      description: 'Describe a real problem, not a startup pitch.',
      fields: [
        { type: 'string', name: 'title', label: 'Short request title', required: true },
        { type: 'paragraph', name: 'problem', label: 'What problem needs solving?', required: true },
        { type: 'paragraph', name: 'outcome', label: 'What would a successful solution do?', required: true },
      ],
    });
    if (result.action !== 'SUBMITTED') return;

    try {
      const output = await api('/api/requests', {
        title: result.values.title,
        problem: result.values.problem,
        outcome: result.values.outcome,
      });
      showToast(output.matched ? 'Matched existing demand — your vote was added.' : 'Build request created.');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create request');
    }
  };

  const act = async (path: string, body?: unknown, message?: string) => {
    try {
      await api(path, body ?? {});
      if (message) showToast(message);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed');
    }
  };

  const addPrototype = async (item: Item) => {
    const result = await showForm({
      title: 'Prototype ready',
      description: 'Add a public URL where supporters can test what you built.',
      fields: [{ type: 'string', name: 'url', label: 'Prototype URL', required: true }],
    });
    if (result.action !== 'SUBMITTED') return;
    await act(
      `/api/requests/${item.id}/prototype`,
      { url: result.values.url },
      'Prototype attached. Testers can open it now.'
    );
  };

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">r/{data?.subredditName ?? 'community'} · DEMAND SIGNAL</div>
        <h1>BUILD THIS</h1>
        <p>Real problems become ranked demand. Developers build what people already asked for.</p>
        <button className="primary" onClick={createRequest}>+ CREATE BUILD REQUEST</button>
      </section>

      <section className="metrics">
        <div><strong>{data?.open ?? 0}</strong><span>active requests</span></div>
        <div><strong>{data?.shipped ?? 0}</strong><span>shipped solutions</span></div>
        <div><strong>{data?.items.reduce((sum, item) => sum + item.supporters, 0) ?? 0}</strong><span>demand votes</span></div>
      </section>

      <nav className="filters">
        {(['ALL', 'OPEN', 'CLAIMED', 'TESTING', 'SHIPPED'] as const).map((value) => (
          <button className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} key={value}>{value}</button>
        ))}
      </nav>

      {loading && !data ? (
        <div className="loading">Loading live demand…</div>
      ) : (
        <section className="grid">
          {items.map((item, rank) => (
            <article className="card" key={item.id}>
              <div className="topline">
                <span className="rank">#{rank + 1}</span>
                <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
              </div>
              <h2>{item.title}</h2>
              <p className="problem">{item.problem}</p>
              <div className="outcome"><b>SUCCESS LOOKS LIKE</b><span>{item.outcome}</span></div>
              <div className="numbers">
                <div><strong>{item.supporters}</strong><span>need this</span></div>
                <div><strong>{item.testers}</strong><span>testers</span></div>
                <div><strong>{item.builders.length}</strong><span>builders</span></div>
              </div>
              {item.builders.length > 0 ? <div className="builders">Building: {item.builders.map((name) => `u/${name}`).join(', ')}</div> : null}
              <div className="actions">
                <button className={item.viewerSupported ? 'done' : ''} onClick={() => act(`/api/requests/${item.id}/support`, {}, item.viewerSupported ? 'Already counted.' : 'Demand +1')}>
                  {item.viewerSupported ? '✓ I NEED THIS' : 'I NEED THIS TOO'}
                </button>
                <button className={item.viewerTester ? 'done' : ''} onClick={() => act(`/api/requests/${item.id}/tester`, {}, 'You are in the beta pool.')}>
                  {item.viewerTester ? '✓ BETA TESTER' : 'I CAN TEST'}
                </button>
                {item.status !== 'SHIPPED' && !item.viewerBuilder ? <button onClick={() => act(`/api/requests/${item.id}/claim`, {}, 'Build claimed.')}>I’M BUILDING</button> : null}
                {item.viewerBuilder && !item.prototypeUrl ? <button onClick={() => addPrototype(item)}>ADD PROTOTYPE</button> : null}
                {item.prototypeUrl ? <button className="prototype" onClick={() => navigateTo(item.prototypeUrl!)}>TEST PROTOTYPE ↗</button> : null}
                {item.prototypeUrl ? (
                  <>
                    <button onClick={() => act(`/api/requests/${item.id}/vote`, { vote: 'works' }, 'Test recorded: works.')}>✓ WORKS {item.works}</button>
                    <button onClick={() => act(`/api/requests/${item.id}/vote`, { vote: 'needs-work' }, 'Test recorded: needs work.')}>NEEDS WORK {item.needsWork}</button>
                  </>
                ) : null}
                {item.viewerBuilder && item.prototypeUrl && item.status !== 'SHIPPED' ? <button className="ship" onClick={() => act(`/api/requests/${item.id}/ship`, {}, 'Marked SHIPPED.')}>MARK SHIPPED</button> : null}
                {item.sourceUrl ? <button className="ghost" onClick={() => navigateTo(item.sourceUrl!)}>SOURCE POST ↗</button> : null}
              </div>
            </article>
          ))}
        </section>
      )}

      <p className="foot">BUILD THIS stores only the minimum identity needed to prevent duplicate actions and show claimed builders. Demand starts from real Reddit posts or user-submitted problems.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
