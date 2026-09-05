// Legate: a discovery agent driven by the model. On a search request it starts
// a runLoop; the model decides which web_search calls to make and when it has
// enough. Several Legates run their own loops concurrently (each its own
// loopId). A safety net searches directly if the model calls no tool.
//   - search.requested : forward work from the Planner
//   - coverage.low     : backward request from the Scribe for more evidence
// so discovery is not a one-way stage: it can be re-triggered mid-run.

import {
	Agent,
	SituationSpecification,
	createAgent,
	type SituationContext,
	type SituationHandler,
	type SituationProcessor,
} from '@mozaik-ai/core';
import { runLoop, state } from '../runtime';
import {
	COVERAGE_LOW,
	SEARCH_REQUESTED,
	type CoverageLow,
	type SearchRequested,
} from '../events';
import { emitFindings, makeWebSearchTool } from '../tools/websearch';
import { config } from '../config';

// Drive one discovery task through the model, with a direct-search fallback.
function research(agent: Agent, runId: string, query: string, instruction: string): void {
	const before = state().runs.get(runId)?.findings.length ?? 0;
	const tool = makeWebSearchTool(agent, runId);

	runLoop(agent.getId(), instruction, {
		model: config.agentModel,
		context: agent.getMemory().getContext(),
		tools: [tool],
	});

	// Safety net: if the model produced no findings (e.g. inference failed or it
	// never called the tool), search directly so the run still yields results.
	setTimeout(() => {
		const now = state().runs.get(runId)?.findings.length ?? 0;
		if (now === before) void emitFindings(agent, runId, query);
	}, config.agentFallbackMs);
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
				research(participant, runId, query, `Research this question and call web_search for the angles you need: ${query}`);
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
				research(participant, runId, query, `Coverage is thin. Search deeper on: ${query}`);
			},
		} satisfies SituationProcessor,
	};

	return [onSearch, onCoverageLow];
}

export function createLegate(index: number, pool: number): Agent {
	return createAgent({
		name: `Legate-${index}`,
		capabilities: ['inference', 'search'],
		instruction:
			'You are Legate, a discovery agent. Given a research question, call the web_search tool for the angles worth exploring (one or two calls), then stop. Do not answer in prose; your job is to gather sources.',
		tools: [],
		handlers: makeHandlers(index, pool),
	});
}
