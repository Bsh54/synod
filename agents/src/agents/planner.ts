// Planner: turns one research request into several search requests, one per
// angle, and drops them on the bus. The Legate agents pick them up in parallel.
// The Planner does not wait for or sequence anything.

import {
	Agent,
	SemanticEvent,
	SituationSpecification,
	createAgent,
	type SituationContext,
	type SituationHandler,
	type SituationProcessor,
} from '@mozaik-ai/core';
import { sendEvent } from '../runtime';
import { RESEARCH_REQUESTED, SEARCH_REQUESTED, type ResearchRequested } from '../events';
import { subQuestions } from '../tools/search';
import { config } from '../config';

class OnResearchRequested extends SituationSpecification {
	isSatisfiedBy({ event, participant }: SituationContext): boolean {
		return event.type === RESEARCH_REQUESTED && event.producerId !== participant.getId();
	}
}

const plan: SituationProcessor = {
	apply({ event, participant }: SituationContext): void {
		if (!(participant instanceof Agent)) return;
		const { runId, question } = event.payload as ResearchRequested;
		const queries = subQuestions(question, config.subQuestions);
		queries.forEach((query, lane) => {
			sendEvent(
				SemanticEvent.create(SEARCH_REQUESTED, participant.getId(), { runId, query, lane }),
				participant.getId(),
			);
		});
	},
};

export function createPlanner(): Agent {
	return createAgent({
		name: 'Planner',
		capabilities: ['plan'],
		instruction: 'You are Planner. You split a research question into angles and dispatch them to the scouts.',
		tools: [],
		handlers: [{ specification: new OnResearchRequested(), processor: plan } satisfies SituationHandler],
	});
}
