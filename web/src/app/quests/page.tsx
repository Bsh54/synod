'use client';

import { useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '@/config/api';

/**
 * synod console: start research runs and watch the swarm work live.
 * Same editorial blueprint language as the landing page.
 */

const ink = '#0a0a0a';
const slate = '#545454';
const silver = '#969696';
const ash = '#dbdbdb';
const fog = '#f6f6f6';
const canvas = '#ffffff';
const accent = '#4b6c42';
const amber = '#b8860b';
const red = '#923d56';

const serif = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
const sans = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const maxW = 1120;

interface Quest {
  questId: string;
  status: string;
  objectives: string;
  createdAt?: string;
  completedAt?: string;
  findings?: number;
  verified?: number;
  rejected?: number;
  results?: { summary?: string };
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: silver, ...style }}>
      {children}
    </span>
  );
}

function isRunning(s: string) {
  return !/(complete|done|closed|fail|error)/i.test(s);
}
function statusColor(s: string) {
  const x = s.toLowerCase();
  if (x.includes('complete') || x.includes('done') || x.includes('closed')) return accent;
  if (x.includes('fail') || x.includes('error')) return red;
  return amber;
}

// One live agent indicator with a pulsing dot while the run is active.
function AgentPulse({ name, role, active }: { name: string; role: string; active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: active ? accent : ash,
          animation: active ? 'synodpulse 1.1s ease-in-out infinite' : 'none',
        }}
      />
      <span style={{ fontFamily: sans, fontSize: 13, color: slate }}>
        <b style={{ color: ink, fontWeight: 600 }}>{name}</b> {role}
      </span>
    </div>
  );
}

export default function ConsolePage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [question, setQuestion] = useState('');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const kicked = useRef(false);

  const fetchQuests = async () => {
    try {
      const res = await fetch(`${API_CONFIG.QUEST_ENGINE_URL}/quests`);
      if (res.ok) {
        const data = await res.json();
        const server: Quest[] = data.quests || [];
        // Merge: server is authoritative; keep any local optimistic rows not yet seen.
        setQuests((prev) => {
          const ids = new Set(server.map((q) => q.questId));
          const locals = prev.filter((q) => q.questId.startsWith('local-') && !ids.has(q.questId));
          return [...locals, ...server].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        });
      }
    } catch {
      /* backend offline: keep whatever we have */
    } finally {
      setLoaded(true);
    }
  };

  const startResearch = async (q: string) => {
    const text = q.trim();
    if (!text || creating) return;
    setCreating(true);
    const localId = 'local-' + Date.now();
    const optimistic: Quest = { questId: localId, status: 'running', objectives: text, createdAt: new Date().toISOString(), findings: 0, verified: 0, rejected: 0 };
    setQuests((s) => [optimistic, ...s]);
    setOpenId(localId);
    setQuestion('');
    try {
      const res = await fetch(`${API_CONFIG.QUEST_ENGINE_URL}/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectives: text }),
      });
      const data = await res.json();
      if (data.questId) {
        // Swap the optimistic row's id for the real one so polling updates it.
        setQuests((s) => s.map((r) => (r.questId === localId ? { ...r, questId: data.questId } : r)));
        setOpenId(data.questId);
      }
      fetchQuests();
    } catch {
      /* keep optimistic row */
    } finally {
      setCreating(false);
    }
  };

  // Pick up a question handed over from the landing page (/quests?q=...).
  useEffect(() => {
    if (kicked.current) return;
    kicked.current = true;
    const q = new URLSearchParams(window.location.search).get('q');
    fetchQuests();
    if (q) {
      startResearch(q);
      window.history.replaceState({}, '', '/quests');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll faster while anything is running, slower when idle.
  useEffect(() => {
    const anyRunning = quests.some((q) => isRunning(q.status));
    const id = setInterval(fetchQuests, anyRunning ? 1500 : 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quests]);

  const shown = quests.filter((q) => (filter === 'all' ? true : filter === 'active' ? isRunning(q.status) : !isRunning(q.status)));

  return (
    <div style={{ background: canvas, color: ink, fontFamily: sans, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes synodpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}`}</style>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${ink} 40%, ${slate} 70%, ${accent})` }} />

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${ash}` }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', color: ink, fontFamily: serif, fontSize: 26 }}>synod</a>
          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <a href="/" style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: slate, textDecoration: 'none' }}>Home</a>
            <Label style={{ color: ink, fontSize: 13, letterSpacing: '0.04em', textTransform: 'none', fontWeight: 600 }}>Console</Label>
          </nav>
        </div>
      </header>

      {/* Composer */}
      <section style={{ maxWidth: maxW, width: '100%', margin: '0 auto', padding: '48px 24px 28px' }}>
        <Label style={{ color: slate }}>Console</Label>
        <h1 style={{ fontFamily: serif, fontWeight: 200, fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', letterSpacing: '-0.02em', margin: '12px 0 0' }}>
          Put a question to the swarm.
        </h1>
        <div style={{ marginTop: 24, border: `1px solid ${ash}`, borderRadius: 12, padding: 18, background: canvas }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startResearch(question);
            }}
            placeholder="Ask a research question, for example: What are the leading approaches to concurrent AI agent runtimes in 2026?"
            style={{ width: '100%', minHeight: 84, resize: 'vertical', border: 'none', outline: 'none', background: 'transparent', fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: ink }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: `1px solid ${fog}`, paddingTop: 12 }}>
            <Label style={{ fontSize: 10 }}>Legate · Assessor · Scribe run concurrently</Label>
            <button
              onClick={() => startResearch(question)}
              disabled={creating || !question.trim()}
              style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: canvas, background: !question.trim() ? silver : ink, border: 'none', borderRadius: 9999, padding: '10px 24px', cursor: creating || !question.trim() ? 'default' : 'pointer' }}
            >
              {creating ? 'Dispatching…' : 'Start research'}
            </button>
          </div>
        </div>
      </section>

      {/* Runs */}
      <section style={{ maxWidth: maxW, width: '100%', margin: '0 auto', padding: '0 24px 80px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${ash}`, paddingBottom: 12 }}>
          <Label>Research runs</Label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, textTransform: 'capitalize', color: filter === f ? ink : silver, background: filter === f ? fog : 'transparent', border: 'none', borderRadius: 9999, padding: '6px 14px', cursor: 'pointer' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div style={{ padding: '72px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 200, color: silver }}>{loaded ? 'No research runs yet.' : 'Loading…'}</div>
            <p style={{ fontFamily: sans, fontSize: 14, color: slate, marginTop: 10 }}>Ask your first question above and the swarm gets to work.</p>
          </div>
        ) : (
          shown.map((q) => {
            const isOpen = openId === q.questId;
            const running = isRunning(q.status);
            return (
              <div key={q.questId} style={{ borderBottom: `1px solid ${ash}` }}>
                <button onClick={() => setOpenId(isOpen ? null : q.questId)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '20px 4px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(q.status), flexShrink: 0, animation: running ? 'synodpulse 1.1s ease-in-out infinite' : 'none' }} />
                  <span style={{ flex: 1, fontFamily: serif, fontSize: 19, fontWeight: 300, color: ink }}>{q.objectives}</span>
                  <span style={{ fontFamily: sans, fontSize: 11, color: silver }}>
                    {(q.findings ?? 0)} found · {(q.verified ?? 0)} verified{(q.rejected ?? 0) ? ` · ${q.rejected} rejected` : ''}
                  </span>
                  <Label style={{ fontSize: 10, color: statusColor(q.status) }}>{q.status}</Label>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 4px 26px 40px' }}>
                    {/* Live agent activity while running */}
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: q.results?.summary ? 20 : 0 }}>
                      <AgentPulse name="Legate" role="searching the web" active={running} />
                      <AgentPulse name="Assessor" role="verifying findings" active={running} />
                      <AgentPulse name="Scribe" role="assembling the answer" active={running} />
                    </div>
                    {q.results?.summary ? (
                      <p style={{ fontFamily: sans, fontSize: 14.5, lineHeight: 1.75, color: slate, whiteSpace: 'pre-wrap', marginTop: 4 }}>{q.results.summary}</p>
                    ) : (
                      <p style={{ fontFamily: sans, fontSize: 13, color: silver, marginTop: 8 }}>The swarm is working. Findings appear as they are verified.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <footer style={{ borderTop: `1px solid ${ash}` }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 20 }}>synod</span>
          <Label style={{ fontSize: 11 }}>Runtime · Mozaik</Label>
        </div>
      </footer>
    </div>
  );
}
