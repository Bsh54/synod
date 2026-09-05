# synod

**A concurrent research swarm, built on the [Mozaik](https://mozaik.jigjoy.ai/) runtime.**

Ask one question. A swarm of agents searches, verifies and synthesizes the answer
**at the same time**, on a shared event bus, with no central scheduler and no
sequential pipeline.

- **Live demo:** https://synod.shadrakbessanh.me
- **Console (watch the swarm work):** https://synod.shadrakbessanh.me/quests
- **Agent API / MCP:** https://synod.shadrakbessanh.me/mcp
- **Swarm API:** https://synod-api.shadrakbessanh.me

Built for the Mozaik Hackathon 2026 (JigJoy x daily.dev x Hyperskill).

---

## Why it exists

Most agent systems run one step, then the next: discover, then verify, then write.
Each stage sits idle while the one before it finishes. That is a sequential pipeline
wearing a multi-agent costume.

synod removes the queue. Every agent is a participant on one Mozaik runtime, reacting
to events the instant they fire. Discovery, verification and synthesis **overlap**, and
the flow is not one-way: when coverage is thin, the Scribe pushes work **back** to the
scouts. The console renders an activity timeline so you can see the agents running
concurrently, not in turns.

## The swarm

| Agent | Role | How |
|---|---|---|
| **Planner** | fans a question into angles | emits one `search.requested` per angle |
| **Legate** x3 | discovery (parallel scouts) | a model-driven agent that calls a `web_search` tool; the model chooses the queries |
| **Assessor** | verification | reacts to every finding the instant it lands, scores it, keeps or rejects |
| **Scribe** | synthesis | folds verified findings into one cited answer; asks Legate for more if coverage is thin |
| **Observer** | telemetry | watches the bus and records the activity timeline (never acts) |

Coordination is entirely event-driven: `research.requested`, `search.requested`,
`finding.produced`, `finding.verified`, `finding.rejected`, `coverage.low`,
`research.completed`. No agent waits for another to "finish".

## What is genuinely Mozaik

- `defineRuntime` + a typed `RuntimeState` shared by every participant.
- Agents, a human coordinator and an observer joined as `Participant`s.
- `SituationSpecification` + `SituationHandler` reactions on the event bus.
- The `web_search` tool as a Mozaik `Tool`; the **model proposes the calls**, the client executes them.
- Inference routed through Mozaik's own inference runner (`getInferenceRunner().run`).

## Architecture

```
question
  -> Planner            splits into angles, emits search.requested (one per angle)
     -> Legate x3       parallel scouts; the model calls web_search, findings stream onto the bus
        -> Assessor     verifies each finding the moment it arrives
           -> Scribe    synthesizes continuously; if coverage is thin, emits coverage.low back to Legate
              -> answer  cited summary + numbered sources
  Observer              records the whole timeline from the bus
```

- **Backend** (`agents/`): TypeScript, `@mozaik-ai/core` 4.x, a small HTTP API.
- **Frontend** (`web/`): Next.js, an editorial console that shows the swarm live.
- **Search:** Tavily when `TAVILY_API_KEY` is set, Wikipedia otherwise (key-free).
- **Inference:** RodiumAI (OpenAI-compatible) with a cheapest-first model fallback chain.

## Run it locally

Backend:

```bash
cd agents
npm install
cp .env.example .env   # add TAVILY_API_KEY and RODIUM_API_KEY (optional; it degrades gracefully)
npm run dev            # swarm API on http://127.0.0.1:8211
```

Frontend:

```bash
cd web
npm install
npm run dev            # console on http://127.0.0.1:8210
```

Then open the console and ask a question.

## Tunable (env, all optional)

| Var | Default | Meaning |
|---|---|---|
| `SYNOD_SCOUTS` | 3 | parallel Legate agents |
| `SYNOD_SUBQUESTIONS` | 5 | angles per run |
| `SYNOD_RESULTS` | 6 | results per search |
| `SYNOD_SEARCH_DEPTH` | advanced | Tavily depth |
| `SYNOD_TOP_SOURCES` | 12 | sources handed to the Scribe / cited |
| `SYNOD_MIN_VERIFIED` | 6 | below this at settle, Scribe asks Legate for more |
| `SYNOD_AGENT_MODEL` | meta/llama-3.1-8b-instruct | model that drives Legate (must support tool calling) |

## Use synod from your own agent

synod exposes its swarm as tools over HTTP. See `/mcp` for the full spec.

```bash
curl -X POST https://synod-api.shadrakbessanh.me/quests \
  -H "Content-Type: application/json" \
  -d '{ "objectives": "What is a service mesh?" }'
# -> { "questId": "run_...", "status": "running" }

curl https://synod-api.shadrakbessanh.me/quests/run_...
# -> status, findings, verified, sources[], results.summary, timeline[]
```

## License

MIT
