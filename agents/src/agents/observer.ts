// Observer: a participant that only watches. It never sends messages or starts
// loops (lesson 4). It reacts to every swarm event on the bus and records the
// activity timeline, deriving the acting agent from the event's producer.
// This is the idiomatic Mozaik way to add cross-cutting behaviour: just join
// another participant, touch nothing else.

import {
	SituationSpecification,
	createHuman,
	type Human,
	type SituationContext,
	type SituationHandler,
	type SituationProcessor,
} from '@mozaik-ai/core';
import { resolveRuntime, state } from '../runtime';
import {
	COVERAGE_LOW,
	FINDING_PRODUCED,
	FINDING_REJECTED,
	FINDING_VERIFIED,
	RESEARCH_COMPLETED,
	SEARCH_REQUESTED,
} from '../events';

const KIND: Record<string, string> = {
	[SEARCH_REQUESTED]: 'search',
	[FINDING_PRODUCED]: 'finding',
	[FINDING_VERIFIED]: 'verified',
	[FINDING_REJECTED]: 'rejected',
	[COVERAGE_LOW]: 'feedback',
	[RESEARCH_COMPLETED]: 'complete',
};

class WhenTheSwarmActs extends SituationSpecification {
	isSatisfiedBy({ event }: SituationContext): boolean {
		return event.type in KIND;
	}
}

const record: SituationProcessor = {
	apply({ event }: SituationContext): void {
		const runId = (event.payload as { runId?: string }).runId;
		if (!runId) return;
		const run = state().runs.get(runId);
		if (!run) return;
		const producer = resolveRuntime().getParticipant(event.producerId);
		const agent = producer?.getManifest().name ?? 'unknown';
		run.timeline.push({ t: Date.now(), agent, kind: KIND[event.type] });
		if (run.timeline.length > 300) run.timeline.shift();
	},
};

export function createObserver(): Human {
	return createHuman({
		name: 'Observer',
		capabilities: [],
		handlers: [{ specification: new WhenTheSwarmActs(), processor: record } satisfies SituationHandler],
	});
}
