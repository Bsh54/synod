'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * synod: concurrent research swarm landing page.
 * Design language: stark editorial blueprint. Ultra-light serif display,
 * monochrome palette, hairline borders, generous whitespace, pill actions.
 */

// ---- Design tokens -------------------------------------------------------
const ink = '#0a0a0a';
const slate = '#545454';
const silver = '#969696';
const ash = '#dbdbdb';
const fog = '#f6f6f6';
const canvas = '#ffffff';
const accent = '#4b6c42'; // olive, used only as a hairline / status accent

const serif = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
const sans = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const maxW = 1120;

// ---- Small building blocks ----------------------------------------------
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: sans,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: silver,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function AgentColumn({
  index,
  code,
  name,
  role,
  desc,
  active,
}: {
  index: string;
  code: string;
  name: string;
  role: string;
  desc: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 220,
        padding: '28px 26px',
        borderLeft: `1px solid ${ash}`,
        background: active ? fog : 'transparent',
        transition: 'background 0.5s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Label>{index}</Label>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: active ? accent : ash,
            transition: 'background 0.4s ease',
          }}
        />
      </div>
      <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: silver, marginTop: 22 }}>
        {code}
      </div>
      <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 300, letterSpacing: '-0.01em', color: ink, marginTop: 6 }}>
        {name}
      </div>
      <div style={{ fontFamily: sans, fontSize: 12, letterSpacing: '0.04em', color: slate, marginTop: 4 }}>{role}</div>
      <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.65, color: slate, marginTop: 18 }}>{desc}</p>
    </div>
  );
}

export default function Home() {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [phase, setPhase] = useState(0); // drives the swarm animation
  const heroRef = useRef<HTMLDivElement>(null);

  // Cycle the three agents so the diagram reads as "running concurrently".
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % 3), 1400);
    return () => clearInterval(id);
  }, []);

  // Hand the question straight to the console, which shows it immediately and
  // starts the run there.
  const startResearch = () => {
    if (!question.trim() || status === 'sending') return;
    setStatus('sending');
    window.location.href = '/quests?q=' + encodeURIComponent(question.trim());
  };

  const nav = ['Overview', 'Runtime'];

  return (
    <div style={{ background: canvas, color: ink, fontFamily: sans, minHeight: '100vh' }}>
      {/* Spectrum hairline: signature brand edge */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${ink} 40%, ${slate} 70%, ${accent})` }} />

      {/* Nav */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${ash}`,
        }}
      >
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', color: ink, fontFamily: serif, fontSize: 26, fontWeight: 400, letterSpacing: '0.01em' }}>
            synod
          </a>
          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="synod-nav">
            {nav.map((n) => (
              <a key={n} href={n === 'Docs' ? '/docs' : n === 'Agents' ? '/agents' : '#' + n.toLowerCase()} style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: slate, textDecoration: 'none' }}>
                {n}
              </a>
            ))}
            <a href="/mcp" style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: slate, textDecoration: 'none' }}>
              Agents
            </a>
            <a
              href="/quests"
              style={{
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 500,
                color: canvas,
                background: ink,
                padding: '9px 18px',
                borderRadius: 9999,
                textDecoration: 'none',
              }}
            >
              Open console
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} style={{ maxWidth: maxW, margin: '0 auto', padding: '92px 24px 64px', textAlign: 'center' }}>
        <Label style={{ color: slate }}>Concurrent research swarm · built on Mozaik</Label>
        <h1
          style={{
            fontFamily: serif,
            fontWeight: 200,
            fontSize: 'clamp(2.6rem, 6.5vw, 5.2rem)',
            lineHeight: 1.04,
            letterSpacing: '-0.03em',
            color: ink,
            margin: '26px auto 0',
            maxWidth: 900,
          }}
        >
          Ask once. A swarm of agents<br />answers <span style={{ fontStyle: 'italic' }}>at the same time.</span>
        </h1>
        <p style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.6, color: slate, maxWidth: 560, margin: '26px auto 0' }}>
          synod runs discovery, verification and synthesis agents in parallel on a shared
          event bus. No queue, no waiting, no sequential pipeline.
        </p>

        {/* Research input */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            maxWidth: 620,
            margin: '38px auto 0',
            border: `1px solid ${ash}`,
            borderRadius: 9999,
            padding: 6,
            background: canvas,
            boxShadow: 'rgba(0,0,0,0.04) 0px 1px 3px 0px',
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startResearch()}
            placeholder="Ask a research question…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: sans,
              fontSize: 15,
              color: ink,
              padding: '10px 16px',
            }}
          />
          <button
            onClick={startResearch}
            disabled={status === 'sending'}
            style={{
              fontFamily: sans,
              fontSize: 13,
              fontWeight: 600,
              color: canvas,
              background: status === 'sent' ? accent : ink,
              border: 'none',
              borderRadius: 9999,
              padding: '10px 22px',
              cursor: status === 'sending' ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.3s ease',
            }}
          >
            {status === 'sending' ? 'Dispatching…' : status === 'sent' ? '✓ Sent to swarm' : 'Start research'}
          </button>
        </div>
      </section>

      {/* Swarm schematic */}
      <section id="runtime" style={{ maxWidth: maxW, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ border: `1px solid ${ash}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${ash}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Mozaik runtime · event bus</Label>
            <Label style={{ color: accent }}>● running concurrently</Label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <AgentColumn index="A" code="Discovery" name="Legate" role="searches the web" active={phase === 0} desc="Many Legate agents search in parallel on different sub-questions, streaming findings onto the bus the moment they arrive." />
            <AgentColumn index="B" code="Verification" name="Assessor" role="checks each finding" active={phase === 1} desc="Assessor agents react to every finding as it lands, grading source quality and reliability without waiting for search to finish." />
            <AgentColumn index="C" code="Synthesis" name="Scribe" role="assembles the answer" active={phase === 2} desc="Scribe agents continuously fold verified findings into one coherent answer while the rest of the swarm is still working." />
          </div>
        </div>
      </section>

      {/* Thesis */}
      <section id="overview" style={{ borderTop: `1px solid ${ash}`, borderBottom: `1px solid ${ash}`, background: fog }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '72px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48 }}>
          <div>
            <Label>The idea</Label>
            <h2 style={{ fontFamily: serif, fontWeight: 300, fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', lineHeight: 1.15, letterSpacing: '-0.02em', color: ink, marginTop: 16 }}>
              Sequential pipelines waste the wait.
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={{ fontFamily: sans, fontSize: 16, lineHeight: 1.7, color: slate }}>
              Most agent systems run one step, then the next, then the next. Each stage sits idle
              while the one before it finishes. synod removes the queue entirely: every agent is a
              participant on a shared bus, reacting to the others the instant there is something to
              do. Discovery, verification and synthesis overlap, which is the point.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: maxW, margin: '0 auto', padding: '80px 24px' }}>
        <Label>How it works</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 1, background: ash, border: `1px solid ${ash}`, marginTop: 24 }}>
          {[
            { n: '01', t: 'Ask', d: 'State a research question. It is broadcast to the swarm as a single event on the Mozaik bus.' },
            { n: '02', t: 'Discover & verify', d: 'Legate agents search in parallel while Assessor agents verify each finding the moment it appears.' },
            { n: '03', t: 'Synthesize', d: 'Scribe agents assemble verified findings into one answer, updating live as the swarm keeps working.' },
          ].map((s) => (
            <div key={s.n} style={{ background: canvas, padding: '34px 30px' }}>
              <div style={{ fontFamily: serif, fontSize: 40, fontWeight: 200, color: silver }}>{s.n}</div>
              <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 300, color: ink, marginTop: 12 }}>{s.t}</div>
              <p style={{ fontFamily: sans, fontSize: 14, lineHeight: 1.65, color: slate, marginTop: 12 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ borderTop: `1px solid ${ash}`, borderBottom: `1px solid ${ash}` }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {[
            { v: '3', l: 'agent roles' },
            { v: '∥', l: 'run concurrently' },
            { v: '0', l: 'central schedulers' },
            { v: '∞', l: 'questions' },
          ].map((s, i) => (
            <div key={s.l} style={{ textAlign: 'center', padding: '8px 16px', borderLeft: i === 0 ? 'none' : `1px solid ${ash}` }}>
              <div style={{ fontFamily: serif, fontWeight: 200, fontSize: 52, lineHeight: 1, color: ink }}>{s.v}</div>
              <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: silver, marginTop: 10 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: maxW, margin: '0 auto', padding: '90px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: serif, fontWeight: 200, fontSize: 'clamp(2rem, 5vw, 3.4rem)', letterSpacing: '-0.02em', color: ink }}>
          Put the swarm to work.
        </h2>
        <a
          href="/quests"
          style={{ display: 'inline-block', marginTop: 28, fontFamily: sans, fontSize: 14, fontWeight: 600, color: canvas, background: ink, padding: '13px 30px', borderRadius: 9999, textDecoration: 'none' }}
        >
          Open the console →
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${ash}` }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '40px 24px', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: serif, fontSize: 22 }}>synod</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <Label style={{ fontSize: 11 }}>Runtime · Mozaik</Label>
            <Label style={{ fontSize: 11 }}>TypeScript</Label>
            <a href="https://github.com/Bsh54/synod" target="_blank" rel="noopener noreferrer" style={{ fontFamily: sans, fontSize: 12, color: slate, textDecoration: 'none' }}>GitHub</a>
          </div>
          <span style={{ fontFamily: sans, fontSize: 11, color: silver }}>© 2026 synod</span>
        </div>
      </footer>
    </div>
  );
}
