// Legate: a discovery agent. Several Legates run in parallel, each owning a
// slice of the search lanes. A Legate reacts to two things:
//   - search.requested  (forward work from the Planner)
//   - coverage.low      (backward request from the Scribe for more evidence)
// so discovery is not a one-way stage: it can be re-triggered mid-run.

import {
	Agent,
	SemanticEvent,
	SituationSpecification,
	createAgent,
	type SituationContext,
	type SituationHandler,
	type SituationProcessor,
} from '@mozaik-ai/core';
import { mark, sendEvent, state } from '../runtime';
import {
	COVERAGE_LOW,
	FINDING_PRODUCED,
	SEARCH_REQUESTED,
	type CoverageLow,
	type SearchRequested,
} from '../events';
import { search } from '../tools/search';
import type { Finding } from '../types';

async function runSearch(agent: Agent, index: number, runId: string, query: string): Promise<void> {
	mark(runId, `Legate-${index}`, 'search');
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
		mark(runId, `Legate-${index}`, 'finding');
		sendEvent(SemanticEvent.create(FINDING_PRODUCED, agent.getId(), { runId, finding }), agent.getId());
		// Stagger so findings visibly stream while other lanes keep running.
		await new Promise((res) => setTimeout(res, 300));
	}
}

function makeHandlers(index: number, pool: number): SituationHandler[] {
	const onSearch: SituationHandler = {
		specification: new (class extends SituationSpecification {
			isSatisfiedBy({ event }: SituationContext): boolean {
				if (event.type !== SEARCH_REQUESTED) return false;
				return (event.payload as SearchRequested).lane % pool === index;
			}
		})(),
		processor: {
			apply({ event, participant }: SituationContext): void {
				if (!(participant instanceof Agent)) return;
				const { runId, query } = event.payload as SearchRequested;
				void runSearch(participant, index, runId, query);
			},
		} satisfies SituationProcessor,
	};

	const onCoverageLow: SituationHandler = {
		specification: new (class extends SituationSpecification {
			isSatisfiedBy({ event }: SituationContext): boolean {
				if (event.type !== COVERAGE_LOW) return false;
				return (event.payload as CoverageLow).round % pool === index;
			}
		})(),
		processor: {
			apply({ event, participant }: SituationContext): void {
				if (!(participant instanceof Agent)) return;
				const { runId, query } = event.payload as CoverageLow;
				mark(runId, `Legate-${index}`, 'feedback');
				void runSearch(participant, index, runId, query);
			},
		} satisfies SituationProcessor,
	};

	return [onSearch, onCoverageLow];
}

export function createLegate(index: number, pool: number): Agent {
	return createAgent({
		name: `Legate-${index}`,
		capabilities: ['search'],
		instruction: 'You are Legate, a discovery agent. You search the web and report findings as you go.',
		tools: [],
		handlers: makeHandlers(index, pool),
	});
}
