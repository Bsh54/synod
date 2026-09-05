'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_CONFIG } from '@/config/api';

/**
 * synod console: start research runs and watch the swarm work live.
 * Three lanes show Legate discovering, Assessor verifying, Scribe synthesizing.
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

interface Item { title: string; url: string; domain: string; query?: string; score?: number; }
interface Source { n: number; title: string; url: string; domain: string; }
interface Quest {
  questId: string;
  status: string;
  objectives: string;
  createdAt?: string;
  findings?: number;
  verified?: number;
  rejected?: number;
  findingList?: Item[];
  verifiedList?: Item[];
  sources?: Source[];
  results?: { summary?: string };
}

// Turn [n] citations in the answer into clickable links to their source.
function renderCited(text: string, sources: Source[]): React.ReactNode[] {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const src = sources.find((s) => s.n === Number(m[1]));
      if (src) return (
        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: accent, fontWeight: 600, textDecoration: 'none' }}>{part}</a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: silver, ...style }}>{children}</span>;
}

const isRunning = (s: string) => !/(complete|done|closed|fail|error)/i.test(s);
function statusColor(s: string) {
  const x = s.toLowerCase();
  if (x.includes('complete') || x.includes('done') || x.includes('closed')) return accent;
  if (x.includes('fail') || x.includes('error')) return red;
  return amber;
}

// A live lane header with a pulsing dot while active.
function LaneHead({ name, role, count, active }: { name: string; role: string; count: number; active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${ash}` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? accent : ash, animation: active ? 'synodpulse 1.1s ease-in-out infinite' : 'none' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: ink }}>{name}</div>
        <div style={{ fontFamily: sans, fontSize: 11, color: silver }}>{role}</div>
      </div>
      <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: slate }}>{count}</span>
    </div>
  );
}

function SourceCard({ item }: { item: Item }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', padding: '10px 14px', borderBottom: `1px solid ${fog}`, animation: 'synodin 0.35s ease' }}>
      <div style={{ fontFamily: sans, fontSize: 13, color: ink, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontFamily: sans, fontSize: 11, color: silver }}>{item.domain}</span>
        {typeof item.score === 'number' && (
          <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, color: accent }}>{Math.round(item.score * 100)}%</span>
        )}
      </div>
    </a>
  );
}

export default function ConsolePage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [question, setQuestion] = useState('');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Quest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const kicked = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const scrolledFor = useRef<string | null>(null);

  const fetchQuests = useCallback(async () => {
    try {
      const res = await fetch(`${API_CONFIG.QUEST_ENGINE_URL}/quests`);
      if (res.ok) {
        const data = await res.json();
        const server: Quest[] = data.quests || [];
        setQuests((prev) => {
          const ids = new Set(server.map((q) => q.questId));
          const locals = prev.filter((q) => q.questId.startsWith('local-') && !ids.has(q.questId));
          return [...locals, ...server].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        });
      }
    } catch { /* offline */ } finally { setLoaded(true); }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    if (id.startsWith('local-')) return;
    try {
      const res = await fetch(`${API_CONFIG.QUEST_ENGINE_URL}/quests/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch { /* offline */ }
  }, []);

  const startResearch = useCallback(async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setCreating(true);
    const localId = 'local-' + Date.now();
    setQuests((s) => [{ questId: localId, status: 'running', objectives: text, createdAt: new Date().toISOString(), findings: 0, verified: 0, rejected: 0 }, ...s]);
    setOpenId(localId);
    setDetail(null);
    setQuestion('');
    try {
      const res = await fetch(`${API_CONFIG.QUEST_ENGINE_URL}/quests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objectives: text }),
      });
      const data = await res.json();
      if (data.questId) {
        setQuests((s) => s.map((r) => (r.questId === localId ? { ...r, questId: data.questId } : r)));
        setOpenId(data.questId);
      }
      fetchQuests();
    } catch { /* keep optimistic */ } finally { setCreating(false); }
  }, [fetchQuests]);

  // Pick up a question handed from the landing page (/quests?q=...).
  useEffect(() => {
    if (kicked.current) return;
    kicked.current = true;
    const q = new URLSearchParams(window.location.search).get('q');
    fetchQuests();
    if (q) { startResearch(q); window.history.replaceState({}, '', '/quests'); }
  }, [fetchQuests, startResearch]);

  // Poll the list; faster while anything runs.
  useEffect(() => {
    const anyRunning = quests.some((q) => isRunning(q.status));
    const id = setInterval(fetchQuests, anyRunning ? 2000 : 6000);
    return () => clearInterval(id);
  }, [quests, fetchQuests]);

  // Poll the open run's detail fast so its lanes fill in live.
  useEffect(() => {
    if (!openId) return;
    fetchDetail(openId);
    const running = detail ? isRunning(detail.status) : true;
    const id = setInterval(() => fetchDetail(openId), running ? 900 : 4000);
    return () => clearInterval(id);
  }, [openId, detail?.status, fetchDetail]);

  // When the final answer lands, scroll down to focus on it (once per run).
  useEffect(() => {
    if (detail && !isRunning(detail.status) && detail.results?.summary && scrolledFor.current !== detail.questId) {
      scrolledFor.current = detail.questId;
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [detail?.status, detail?.questId, detail?.results?.summary]);

  const shown = quests.filter((q) => (filter === 'all' ? true : filter === 'active' ? isRunning(q.status) : !isRunning(q.status)));
  const d = detail;
  const dRunning = d ? isRunning(d.status) : false;

  return (
    <div style={{ background: canvas, color: ink, fontFamily: sans, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes synodpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}@keyframes synodin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
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
      <section style={{ maxWidth: maxW, width: '100%', margin: '0 auto', padding: '40px 24px 24px' }}>
        <Label style={{ color: slate }}>Console</Label>
        <h1 style={{ fontFamily: serif, fontWeight: 200, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.02em', margin: '10px 0 0' }}>Put a question to the swarm.</h1>
        <div style={{ marginTop: 20, border: `1px solid ${ash}`, borderRadius: 12, padding: 16, background: canvas }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startResearch(question); }}
            placeholder="Ask a research question, for example: What are the leading approaches to concurrent AI agent runtimes in 2026?"
            style={{ width: '100%', minHeight: 72, resize: 'vertical', border: 'none', outline: 'none', background: 'transparent', fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: ink }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTop: `1px solid ${fog}`, paddingTop: 10 }}>
            <Label style={{ fontSize: 10 }}>Legate · Assessor · Scribe run concurrently</Label>
            <button onClick={() => startResearch(question)} disabled={creating || !question.trim()} style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: canvas, background: !question.trim() ? silver : ink, border: 'none', borderRadius: 9999, padding: '10px 24px', cursor: creating || !question.trim() ? 'default' : 'pointer' }}>
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
              <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, textTransform: 'capitalize', color: filter === f ? ink : silver, background: filter === f ? fog : 'transparent', border: 'none', borderRadius: 9999, padding: '6px 14px', cursor: 'pointer' }}>{f}</button>
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
            const open = openId === q.questId;
            const running = isRunning(q.status);
            return (
              <div key={q.questId} style={{ borderBottom: `1px solid ${ash}` }}>
                <button onClick={() => { setOpenId(open ? null : q.questId); setDetail(null); }} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '18px 4px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(q.status), flexShrink: 0, animation: running ? 'synodpulse 1.1s ease-in-out infinite' : 'none' }} />
                  <span style={{ flex: 1, fontFamily: serif, fontSize: 19, fontWeight: 300, color: ink }}>{q.objectives}</span>
                  <span style={{ fontFamily: sans, fontSize: 11, color: silver }}>{(q.findings ?? 0)} found · {(q.verified ?? 0)} verified</span>
                  <Label style={{ fontSize: 10, color: statusColor(q.status) }}>{q.status}</Label>
                </button>

                {open && (
                  <div style={{ padding: '4px 4px 28px' }}>
                    {/* Live board: three concurrent lanes */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                      <div style={{ border: `1px solid ${ash}`, borderRadius: 10, overflow: 'hidden' }}>
                        <LaneHead name="Legate" role="discovering sources" count={d?.findingList?.length ?? q.findings ?? 0} active={dRunning} />
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                          {(d?.findingList ?? []).map((it) => <SourceCard key={'f' + it.url} item={it} />)}
                          {(!d?.findingList || d.findingList.length === 0) && <div style={{ padding: 16, fontFamily: sans, fontSize: 12, color: silver }}>searching…</div>}
                        </div>
                      </div>

                      <div style={{ border: `1px solid ${ash}`, borderRadius: 10, overflow: 'hidden' }}>
                        <LaneHead name="Assessor" role="verifying findings" count={d?.verifiedList?.length ?? q.verified ?? 0} active={dRunning} />
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                          {(d?.verifiedList ?? []).map((it) => <SourceCard key={'v' + it.url} item={it} />)}
                          {(!d?.verifiedList || d.verifiedList.length === 0) && <div style={{ padding: 16, fontFamily: sans, fontSize: 12, color: silver }}>waiting for findings…</div>}
                          {(d?.rejected ?? 0) > 0 && <div style={{ padding: '10px 14px', fontFamily: sans, fontSize: 11, color: silver }}>{d?.rejected} rejected as low relevance</div>}
                        </div>
                      </div>

                      <div style={{ border: `1px solid ${ash}`, borderRadius: 10, overflow: 'hidden' }}>
                        <LaneHead name="Scribe" role="assembling the answer" count={d?.results?.summary ? 1 : 0} active={dRunning} />
                        <div style={{ maxHeight: 320, overflowY: 'auto', padding: 16 }}>
                          {d?.results?.summary ? (
                            dRunning ? (
                              <p style={{ fontFamily: sans, fontSize: 13, lineHeight: 1.65, color: slate, whiteSpace: 'pre-wrap', margin: 0 }}>{d.results.summary}</p>
                            ) : (
                              <div style={{ fontFamily: sans, fontSize: 13, color: accent, fontWeight: 600 }}>Answer ready below ↓</div>
                            )
                          ) : (
                            <div style={{ fontFamily: sans, fontSize: 12, color: silver }}>waiting for verified findings…</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Final result, brought into focus once the run completes */}
                    {!dRunning && d?.results?.summary && (
                      <div ref={resultRef} style={{ marginTop: 24, border: `1px solid ${ash}`, borderRadius: 12, padding: '28px 26px', background: fog }}>
                        <Label style={{ color: slate }}>Result</Label>
                        <h3 style={{ fontFamily: serif, fontWeight: 300, fontSize: 24, letterSpacing: '-0.01em', color: ink, margin: '10px 0 18px' }}>{d.objectives}</h3>
                        <p style={{ fontFamily: sans, fontSize: 15.5, lineHeight: 1.8, color: ink, whiteSpace: 'pre-wrap', margin: 0 }}>
                          {renderCited(d.results.summary, d.sources ?? [])}
                        </p>
                        {(d.sources?.length ?? 0) > 0 && (
                          <div style={{ marginTop: 24, borderTop: `1px solid ${ash}`, paddingTop: 18 }}>
                            <Label style={{ color: slate }}>Sources</Label>
                            <ol style={{ margin: '12px 0 0', padding: 0, listStyle: 'none' }}>
                              {d.sources!.map((s) => (
                                <li key={s.n} style={{ display: 'flex', gap: 10, padding: '6px 0', fontFamily: sans, fontSize: 13.5 }}>
                                  <span style={{ color: accent, fontWeight: 600, minWidth: 24 }}>[{s.n}]</span>
                                  <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: ink, textDecoration: 'none', lineHeight: 1.5 }}>
                                    {s.title} <span style={{ color: silver }}>· {s.domain}</span>
                                  </a>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
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
