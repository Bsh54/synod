// Minimal HTTP API in front of the swarm. The web console talks to this.
// Endpoints:
//   GET  /health        liveness + swarm info
//   GET  /quests        list research runs
//   POST /quests        { objectives } -> start a run, returns { questId }
//   GET  /quests/:id     one run

import 'dotenv/config';
import { createServer } from 'node:http';
import { initSwarm, startRun, listRuns, getRun } from './swarm';
import type { ResearchRun } from './types';

const PORT = Number(process.env.PORT ?? 8211);

function toApi(run: ResearchRun) {
	return {
		questId: run.questId,
		status: run.status,
		objectives: run.objectives,
		createdAt: run.createdAt,
		completedAt: run.completedAt,
		findings: run.findings.length,
		verified: run.verified.length,
		rejected: run.rejected,
		results: run.summary ? { summary: run.summary } : undefined,
	};
}

function domainOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

// Full detail for the live run view: the actual findings and verifications,
// so the console can show the swarm working instead of just counts.
function toDetail(run: ResearchRun) {
	return {
		...toApi(run),
		findingList: run.findings.slice(-40).map((f) => ({ title: f.title, url: f.url, domain: domainOf(f.url), query: f.query })),
		verifiedList: run.verified
			.slice()
			.sort((a, b) => b.score - a.score)
			.slice(0, 40)
			.map((f) => ({ title: f.title, url: f.url, domain: domainOf(f.url), score: f.score })),
	};
}

function send(res: import('node:http').ServerResponse, code: number, body: unknown) {
	const data = JSON.stringify(body);
	res.writeHead(code, {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	});
	res.end(data);
}

initSwarm();

const server = createServer((req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
	const path = url.pathname;

	if (req.method === 'OPTIONS') return send(res, 204, {});

	if (req.method === 'GET' && path === '/health') {
		return send(res, 200, { status: 'ok', swarm: 'synod', agents: ['Legate', 'Assessor', 'Scribe'] });
	}

	if (req.method === 'GET' && path === '/quests') {
		return send(res, 200, { quests: listRuns().map(toApi) });
	}

	if (req.method === 'POST' && path === '/quests') {
		let body = '';
		req.on('data', (c) => (body += c));
		req.on('end', () => {
			try {
				const { objectives } = JSON.parse(body || '{}') as { objectives?: string };
				if (!objectives || !objectives.trim()) return send(res, 400, { error: 'objectives required' });
				const questId = startRun(objectives.trim());
				send(res, 201, { questId, status: 'running' });
			} catch {
				send(res, 400, { error: 'invalid json' });
			}
		});
		return;
	}

	const match = path.match(/^\/quests\/(.+)$/);
	if (req.method === 'GET' && match) {
		const run = getRun(match[1]);
		return run ? send(res, 200, toDetail(run)) : send(res, 404, { error: 'not found' });
	}

	send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
	console.log(`[synod] swarm API listening on http://127.0.0.1:${PORT}`);
});
