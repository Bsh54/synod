'use client';

/**
 * synod MCP / agent-API page: tells other agents how to use the platform.
 * synod exposes its research swarm as callable tools over a small HTTP API.
 */

const ink = '#0a0a0a';
const slate = '#545454';
const silver = '#969696';
const ash = '#dbdbdb';
const fog = '#f6f6f6';
const canvas = '#ffffff';
const accent = '#4b6c42';

const serif = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
const sans = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const mono = "'SF Mono', ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace";
const maxW = 900;

const API = 'https://synod-api.shadrakbessanh.me';

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: silver }}>{children}</span>;
}

function Code({ children }: { children: string }) {
  return (
    <pre style={{ fontFamily: mono, fontSize: 12.5, lineHeight: 1.65, color: ink, background: fog, border: `1px solid ${ash}`, borderRadius: 8, padding: '16px 18px', overflowX: 'auto', margin: '12px 0 0', whiteSpace: 'pre' }}>
      {children}
    </pre>
  );
}

function Tool({ name, desc, method, path, children }: { name: string; method: string; path: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${ash}`, borderRadius: 12, padding: '22px 24px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 600, color: ink }}>{name}</span>
        <span style={{ fontFamily: mono, fontSize: 12, color: accent }}>{method} {path}</span>
      </div>
      <p style={{ fontFamily: sans, fontSize: 14, color: slate, lineHeight: 1.6, margin: '8px 0 0' }}>{desc}</p>
      {children}
    </div>
  );
}

export default function McpPage() {
  return (
    <div style={{ background: canvas, color: ink, fontFamily: sans, minHeight: '100vh' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${ink} 40%, ${slate} 70%, ${accent})` }} />
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${ash}` }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', color: ink, fontFamily: serif, fontSize: 26 }}>synod</a>
          <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="/" style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: slate, textDecoration: 'none' }}>Home</a>
            <a href="/quests" style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: slate, textDecoration: 'none' }}>Console</a>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: ink }}>Agents</span>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: maxW, margin: '0 auto', padding: '64px 24px 96px' }}>
        <Label>For agents</Label>
        <h1 style={{ fontFamily: serif, fontWeight: 200, fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', letterSpacing: '-0.02em', margin: '14px 0 0' }}>
          Use synod from your agents.
        </h1>
        <p style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.7, color: slate, maxWidth: 640, marginTop: 18 }}>
          synod is a concurrent research swarm. Any agent can hand it a question and get back a
          verified, sourced answer. It exposes three tools over a small HTTP API, so it drops into
          MCP-compatible agents or any framework that can call a URL.
        </p>

        <div style={{ marginTop: 22, border: `1px solid ${ash}`, borderRadius: 10, padding: '14px 18px', background: fog }}>
          <Label>Base URL</Label>
          <div style={{ fontFamily: mono, fontSize: 14, color: ink, marginTop: 6 }}>{API}</div>
        </div>

        {/* Tools */}
        <h2 style={{ fontFamily: serif, fontWeight: 300, fontSize: 28, letterSpacing: '-0.01em', marginTop: 48 }}>Tools</h2>

        <Tool name="synod_research" method="POST" path="/quests" desc="Start a research run. The swarm searches, verifies and synthesizes concurrently. Returns a questId to poll.">
          <Code>{`curl -X POST ${API}/quests \\
  -H "Content-Type: application/json" \\
  -d '{ "objectives": "What are the leading approaches to concurrent AI agent runtimes?" }'

# -> { "questId": "run_ab12cd", "status": "running" }`}</Code>
        </Tool>

        <Tool name="synod_get_research" method="GET" path="/quests/:id" desc="Fetch a run. Poll until status is completed, then read results.summary and sources. findingList and verifiedList show live progress; timeline shows which agents were active when.">
          <Code>{`curl ${API}/quests/run_ab12cd

# -> {
#   "status": "completed",
#   "objectives": "...",
#   "findings": 30, "verified": 29, "rejected": 1,
#   "sources": [ { "n": 1, "title": "...", "url": "https://...", "domain": "..." } ],
#   "results": { "summary": "... answer with inline [1] [2] citations ..." },
#   "timeline": [ { "t": 1736..., "agent": "Legate-0", "kind": "finding" } ]
# }`}</Code>
        </Tool>

        <Tool name="synod_list_research" method="GET" path="/quests" desc="List recent research runs with their status and counts.">
          <Code>{`curl ${API}/quests

# -> { "quests": [ { "questId": "...", "status": "completed", "objectives": "..." } ] }`}</Code>
        </Tool>

        {/* MCP */}
        <h2 style={{ fontFamily: serif, fontWeight: 300, fontSize: 28, letterSpacing: '-0.01em', marginTop: 48 }}>As an MCP tool</h2>
        <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: slate, marginTop: 12 }}>
          Register synod as a tool your agent can call. Any framework works; here is a portable tool
          definition (JSON Schema) that maps to the API above.
        </p>
        <Code>{`{
  "name": "synod_research",
  "description": "Run a concurrent research swarm on a question and return a verified, sourced answer.",
  "parameters": {
    "type": "object",
    "properties": {
      "objectives": { "type": "string", "description": "The research question." }
    },
    "required": ["objectives"]
  },
  "endpoint": { "method": "POST", "url": "${API}/quests" },
  "poll": { "method": "GET", "url": "${API}/quests/{questId}", "until": "status == 'completed'" }
}`}</Code>

        {/* Loop suggestion */}
        <h2 style={{ fontFamily: serif, fontWeight: 300, fontSize: 28, letterSpacing: '-0.01em', marginTop: 48 }}>Typical agent loop</h2>
        <Code>{`1. POST /quests with your question       -> questId
2. GET  /quests/{questId} every ~1s      -> watch findings / verified rise
3. when status == "completed"            -> read results.summary + sources
4. cite sources[n].url for each [n] in the summary`}</Code>

        <p style={{ fontFamily: sans, fontSize: 13, color: silver, marginTop: 40 }}>
          Runs are typically a few seconds. No auth is required for the hackathon deployment.
        </p>
      </main>

      <footer style={{ borderTop: `1px solid ${ash}` }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: serif, fontSize: 20 }}>synod</span>
          <Label>Runtime · Mozaik</Label>
        </div>
      </footer>
    </div>
  );
}
