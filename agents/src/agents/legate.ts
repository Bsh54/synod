// Legate: a model-driven discovery agent. For each task it runs one inference
// through the Mozaik runner with the web_search tool exposed; the model decides
// which searches to make (tool calls), and Legate executes them, streaming
// findings onto the bus. This is the "model proposes, client executes" pattern:
// a single, safe turn with no fragile follow-up inference. A direct-search
// fallback guarantees results even if the model proposes no call.
//   - search.requested : forward work from the Planner
//   - coverage.low     : backward request from the Scribe for more evidence

import {
	Agent,
	FunctionCallItem,
	ModelContext,
	SystemMessageItem,
	UserMessageItem,
	SituationSpecification,
	createAgent,
	type SituationContext,
	type SituationHandler,
	type SituationProcessor,
} from '@mozaik-ai/core';
import { resolveRuntime, state } from '../runtime';
import {
	COVERAGE_LOW,
	SEARCH_REQUESTED,
	type CoverageLow,
	type SearchRequested,
} from '../events';
import { emitFindings, makeWebSearchTool } from '../tools/websearch';
import { config } from '../config';

const SYSTEM =
	'You are Legate, a discovery agent. Given a research task, call the web_search tool for the one or two angles worth exploring. Only make tool calls; do not write prose.';

async function research(agent: Agent, runId: string, query: string, task: string): Promise<void> {
	const before = state().runs.get(runId)?.findings.length ?? 0;
	const tool = makeWebSearchTool(agent, runId);

	try {
		const runner = resolveRuntime().getInferenceRunner();
		const context = ModelContext.create()
			.addContextItem(SystemMessageItem.create(SYSTEM))
			.addContextItem(UserMessageItem.create(task));
		const out = await runner.run({ model: config.agentModel, context, tools: [tool] });

		// Execute exactly what the model proposed.
		const calls = out.items.filter((i) => i.getType() === 'function_call') as FunctionCallItem[];
		for (const call of calls) {
			if (call.name !== 'web_search') continue;
			let args: { query?: string } = {};
			try {
				args = JSON.parse(call.args || '{}');
			} catch {
				/* ignore malformed args */
			}
			await tool.invoke({ query: args.query || query });
		}
	} catch {
		/* inference failed (e.g. no credits); the fallback below covers it */
	}

	// Safety net: if nothing came back, search the original query directly.
	const produced = (state().runs.get(runId)?.findings.length ?? 0) - before;
	if (produced === 0) await emitFindings(agent, runId, query);
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
				void research(participant, runId, query, `Research this question: ${query}`);
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
				void research(participant, runId, query, `Coverage is thin. Search deeper on: ${query}`);
			},
		} satisfies SituationProcessor,
	};

	return [onSearch, onCoverageLow];
}

export function createLegate(index: number, pool: number): Agent {
	return createAgent({
		name: `Legate-${index}`,
		capabilities: ['inference', 'search'],
		instruction: SYSTEM,
		tools: [],
		handlers: makeHandlers(index, pool),
	});
}
