'use client';

import { useEffect, useState } from 'react';
import { API_CONFIG } from '@/config/api';

/**
 * synod console: start research runs and watch the swarm work.
 * Same editorial blueprint language as the landing page.
 */

// ---- Design tokens -------------------------------------------------------
const ink = '#0a0a0a';
const slate = '#545454';
const silver = '#969696';
const ash = '#dbdbdb';
const fog = '#f6f6f6';
const canvas = '#ffffff';
const accent = '#4b6c42';

const serif = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
const sans = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const maxW = 1120;

interface Quest {
  questId: string;
  status: string;
  objectives: string;
  createdAt?: string;
  completedAt?: string;
  results?: { summary?: string };
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: silver, ...style }}>
      {children}
    </span>
  );
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes('complete') || s.includes('done') || s.includes('closed')) return accent;
  if (s.includes('fail') || s.includes('error')) return '#923d56';
  return '#b8860b'; // running / pending: amber
}

export default function ConsolePage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [question, setQuestion] = useState('');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchQuests = async () => {
    try {
      const res = await fetch(`${API_CONFIG.QUEST_ENGINE_URL}/quests`);
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
      }
    } catch {
      /* backend offline: keep whatever we have, show empty state */
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchQuests();
    const id = setInterval(fetchQuests, 5000);
    return () => clearInterval(id);
  }, []);

  const startResearch = async () => {
    if (!question.trim() || creating) return;
    setCreating(true);
    const optimistic: Quest = {
      questId: 'local-' + Date.now(),
      status: 'running',
      objectives: question.trim(),
      createdAt: new Date().toISOString(),
    };
    setQuests((q) => [optimistic, ...q]);
    setQuestion('');
    try {
      await fetch(`${API_CONFIG.QUEST_ENGINE_URL}/quests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectives: optimistic.objectives }),
      });
      fetchQuests();
    } catch {
      /* keep the optimistic row */
    } finally {
      setCreating(false);
    }
  };

  const isActive = (s: string) => !/(complete|done|closed|fail|error)/i.test(s);
  const shown = quests.filter((q) =>
    filter === 'all' ? true : filter === 'active' ? isActive(q.status) : !isActive(q.status),
  );

  return (
    <div style={{ background: canvas, color: ink, fontFamily: sans, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${ink} 40%, ${slate} 70%, ${accent})` }} />

      {/* Nav */}
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
      <section style={{ maxWidth: maxW, width: '100%', margin: '0 auto', padding: '56px 24px 32px' }}>
        <Label style={{ color: slate }}>Console</Label>
        <h1 style={{ fontFamily: serif, fontWeight: 200, fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', letterSpacing: '-0.02em', margin: '14px 0 0' }}>
          Put a question to the swarm.
        </h1>
        <div style={{ marginTop: 28, border: `1px solid ${ash}`, borderRadius: 12, padding: 18, background: canvas }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a research question, for example: What are the leading approaches to concurrent AI agent runtimes in 2026?"
            style={{ width: '100%', minHeight: 96, resize: 'vertical', border: 'none', outline: 'none', background: 'transparent', fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: ink }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: `1px solid ${fog}`, paddingTop: 12 }}>
            <Label style={{ fontSize: 10 }}>Legate · Assessor · Scribe run concurrently</Label>
            <button
              onClick={startResearch}
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
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, textTransform: 'capitalize', color: filter === f ? ink : silver, background: filter === f ? fog : 'transparent', border: 'none', borderRadius: 9999, padding: '6px 14px', cursor: 'pointer' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 200, color: silver }}>
              {loaded ? 'No research runs yet.' : 'Loading…'}
            </div>
            <p style={{ fontFamily: sans, fontSize: 14, color: slate, marginTop: 10 }}>
              Ask your first question above and the swarm gets to work.
            </p>
          </div>
        ) : (
          <div>
            {shown.map((q) => {
              const isOpen = openId === q.questId;
              return (
                <div key={q.questId} style={{ borderBottom: `1px solid ${ash}` }}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : q.questId)}
                    style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '22px 4px', display: 'flex', alignItems: 'center', gap: 16 }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(q.status), flexShrink: 0 }} />
                    <span style={{ flex: 1, fontFamily: serif, fontSize: 19, fontWeight: 300, color: ink }}>{q.objectives}</span>
                    <Label style={{ fontSize: 10, color: statusColor(q.status) }}>{q.status}</Label>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 4px 26px 40px' }}>
                      {q.results?.summary ? (
                        <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.7, color: slate }}>{q.results.summary}</p>
                      ) : (
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                          {[
                            { n: 'Legate', d: 'searching the web' },
                            { n: 'Assessor', d: 'verifying findings' },
                            { n: 'Scribe', d: 'assembling the answer' },
                          ].map((a) => (
                            <div key={a.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
                              <span style={{ fontFamily: sans, fontSize: 13, color: slate }}>
                                <b style={{ color: ink, fontWeight: 600 }}>{a.n}</b> {a.d}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
