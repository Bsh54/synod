// The web_search tool the Legate model calls during its runLoop. Its invoke()
// runs a real search, streams each result onto the bus as finding.produced
// (so the Assessor reacts immediately), and returns a short digest to the model
// so it can decide whether to search again or stop.

import { Agent, SemanticEvent, type Tool } from '@mozaik-ai/core';
import { sendEvent, state } from '../runtime';
import { FINDING_PRODUCED } from '../events';
import { search } from './search';
import type { Finding } from '../types';

export async function emitFindings(agent: Agent, runId: string, query: string): Promise<number> {
	const results = await search(query);
	for (const [i, r] of results.entries()) {
		const finding: Finding = {
			id: `${runId}:${query}:${i}:${Date.now()}`,
			runId,
			query,
			title: r.title,
			url: r.url,
			snippet: r.snippet,
		};
		const run = state().runs.get(runId);
		if (run) run.findings.push(finding);
		sendEvent(SemanticEvent.create(FINDING_PRODUCED, agent.getId(), { runId, finding }), agent.getId());
		await new Promise((res) => setTimeout(res, 300));
	}
	return results.length;
}

export function makeWebSearchTool(agent: Agent, runId: string): Tool {
	return {
		type: 'function',
		name: 'web_search',
		description: 'Search the web for a query and return the results. Call it for each distinct angle you want to research.',
		parameters: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'The search query.' },
			},
			required: ['query'],
			additionalProperties: false,
		},
		strict: true,
		invoke: async ({ query }: { query: string }) => {
			const n = await emitFindings(agent, runId, String(query));
			return { query, results: n, note: `Streamed ${n} results onto the bus for verification.` };
		},
	};
}
