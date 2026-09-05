// Scribe: the synthesis agent. Every verified finding folds into a running
// answer while the rest of the swarm is still working. When verified findings
// stop arriving for a short window, the Scribe seals the run as completed.

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
import { FINDING_VERIFIED, RESEARCH_COMPLETED, type FindingVerified } from '../events';
import type { VerifiedFinding } from '../types';

const SETTLE_MS = 2500;
const settleTimers = new Map<string, ReturnType<typeof setTimeout>>();

function composeSummary(objectives: string, verified: VerifiedFinding[]): string {
	const seen = new Set<string>();
	const top = verified
		.slice()
		.sort((a, b) => b.score - a.score)
		.filter((f) => (seen.has(f.title) ? false : (seen.add(f.title), true)))
		.slice(0, 6);
	if (top.length === 0) return `No reliable findings were gathered for: ${objectives}.`;
	const lines = top.map((f) => `- ${f.title}: ${f.snippet} (${f.url})`);
	return `Research brief for: ${objectives}\n\n${lines.join('\n')}`;
}

const synthesize: SituationProcessor = {
	apply({ event, participant }: SituationContext): void {
		if (!(participant instanceof Agent)) return;
		const { runId } = event.payload as FindingVerified;
		const run = state().runs.get(runId);
		if (!run) return;

		// Keep the answer live as evidence accumulates.
		run.summary = composeSummary(run.objectives, run.verified);

		// Debounce: seal the run once verified findings settle down.
		const existing = settleTimers.get(runId);
		if (existing) clearTimeout(existing);
		settleTimers.set(
			runId,
			setTimeout(() => {
				const current = state().runs.get(runId);
				if (current && current.status === 'running') {
					current.status = 'completed';
					current.completedAt = new Date().toISOString();
					current.summary = composeSummary(current.objectives, current.verified);
					sendEvent(
						SemanticEvent.create(RESEARCH_COMPLETED, participant.getId(), {
							runId,
							summary: current.summary,
						}),
						participant.getId(),
					);
				}
				settleTimers.delete(runId);
			}, SETTLE_MS),
		);
	},
};

export function createScribe(): Agent {
	return createAgent({
		name: 'Scribe',
		capabilities: ['synthesize'],
		instruction:
			'You are Scribe, a synthesis agent. You assemble verified findings into one coherent answer, updating continuously.',
		tools: [],
		handlers: [{ specification: new OnFindingVerified(), processor: synthesize } satisfies SituationHandler],
	});
}

class OnFindingVerified extends SituationSpecification {
	isSatisfiedBy({ event, participant }: SituationContext): boolean {
		return event.type === FINDING_VERIFIED && event.producerId !== participant.getId();
	}
}
