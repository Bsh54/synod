// Legate: the discovery agent. On a research request it fans out several
// searches at once and streams each finding onto the bus the moment it
// arrives, without waiting for the other queries to finish.

import {
	Agent,
	SemanticEvent,
	SituationSpecification,
	createAgent,
	type SituationContext,
	type SituationHandler,
	type SituationProcessor,
} from '@mozaik-ai/core';
import { sendEvent, state } from '../runtime';
import { FINDING_PRODUCED, RESEARCH_REQUESTED, type ResearchRequested } from '../events';
import { search, subQuestions } from '../tools/search';
import type { Finding } from '../types';

class OnResearchRequested extends SituationSpecification {
	isSatisfiedBy({ event, participant }: SituationContext): boolean {
		return event.type === RESEARCH_REQUESTED && event.producerId !== participant.getId();
	}
}

const discover: SituationProcessor = {
	apply({ event, participant }: SituationContext): void {
		if (!(participant instanceof Agent)) return;
		const { runId, question } = event.payload as ResearchRequested;

		// Fire every sub-question concurrently. Each resolves on its own and
		// emits findings independently, so discovery overlaps verification.
		for (const query of subQuestions(question)) {
			void (async () => {
				const results = await search(query);
				for (const [i, r] of results.entries()) {
					const finding: Finding = {
						id: `${runId}:${query}:${i}`,
						runId,
						query,
						title: r.title,
						url: r.url,
						snippet: r.snippet,
					};
					const run = state().runs.get(runId);
					if (run) run.findings.push(finding);
					sendEvent(
						SemanticEvent.create(FINDING_PRODUCED, participant.getId(), { runId, finding }),
						participant.getId(),
					);
				}
			})();
		}
	},
};

export function createLegate(): Agent {
	return createAgent({
		name: 'Legate',
		capabilities: ['search'],
		instruction:
			'You are Legate, a discovery agent. You search the web for a research question and report findings as you go.',
		tools: [],
		handlers: [{ specification: new OnResearchRequested(), processor: discover } satisfies SituationHandler],
	});
}
