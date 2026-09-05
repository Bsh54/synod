// Assessor: the verification agent. It reacts to every finding the instant
// it lands on the bus, scores it for relevance and source quality, and emits
// either a verified or a rejected event. It never waits for discovery to end.

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
import {
	FINDING_PRODUCED,
	FINDING_REJECTED,
	FINDING_VERIFIED,
	type FindingProduced,
} from '../events';
import { config } from '../config';
import type { VerifiedFinding } from '../types';

class OnFindingProduced extends SituationSpecification {
	isSatisfiedBy({ event, participant }: SituationContext): boolean {
		return event.type === FINDING_PRODUCED && event.producerId !== participant.getId();
	}
}

// A small, deterministic reliability score. Swappable for an LLM judge later.
function scoreFinding(query: string, snippet: string): number {
	if (!snippet) return 0;
	const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
	const text = snippet.toLowerCase();
	const hits = terms.filter((t) => text.includes(t)).length;
	const coverage = terms.length ? hits / terms.length : 0;
	const depth = Math.min(snippet.length / 300, 1);
	return Math.round((coverage * 0.7 + depth * 0.3) * 100) / 100;
}

const assess: SituationProcessor = {
	apply({ event, participant }: SituationContext): void {
		if (!(participant instanceof Agent)) return;
		const { runId, finding } = event.payload as FindingProduced;
		const run = state().runs.get(runId);
		const score = scoreFinding(finding.query, finding.snippet);

		if (score >= config.verifyThreshold) {
			const verified: VerifiedFinding = { ...finding, score };
			if (run) run.verified.push(verified);
			sendEvent(
				SemanticEvent.create(FINDING_VERIFIED, participant.getId(), { runId, finding: verified }),
				participant.getId(),
			);
		} else {
			if (run) run.rejected += 1;
			sendEvent(
				SemanticEvent.create(FINDING_REJECTED, participant.getId(), {
					runId,
					finding,
					reason: 'low relevance',
				}),
				participant.getId(),
			);
		}
	},
};

export function createAssessor(): Agent {
	return createAgent({
		name: 'Assessor',
		capabilities: ['verify'],
		instruction:
			'You are Assessor, a verification agent. You judge each finding for relevance and source quality as it arrives.',
		tools: [],
		handlers: [{ specification: new OnFindingProduced(), processor: assess } satisfies SituationHandler],
	});
}
