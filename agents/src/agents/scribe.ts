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
import { complete, llmAvailable } from '../tools/llm';

const SETTLE_MS = 2500;
const settleTimers = new Map<string, ReturnType<typeof setTimeout>>();

// The ordered, deduped evidence used for both the prompt and the [n] citations.
function topFindings(verified: VerifiedFinding[]): VerifiedFinding[] {
	const seen = new Set<string>();
	return verified
		.slice()
		.sort((a, b) => b.score - a.score)
		.filter((f) => (seen.has(f.title) ? false : (seen.add(f.title), true)))
		.slice(0, 8);
}

// Deterministic fallback used when no LLM is configured or every model fails.
function composeSummary(objectives: string, top: VerifiedFinding[]): string {
	if (top.length === 0) return `No reliable findings were gathered for: ${objectives}.`;
	const lines = top.map((f, i) => `[${i + 1}] ${f.title}: ${f.snippet}`);
	return `Research brief for: ${objectives}\n\n${lines.join('\n')}`;
}

// LLM synthesis over the exact ordered evidence, with the brief as fallback.
async function writeAnswer(objectives: string, top: VerifiedFinding[]): Promise<string> {
	if (!llmAvailable() || top.length === 0) return composeSummary(objectives, top);
	const evidence = top.map((f, i) => `[${i + 1}] ${f.title}: ${f.snippet} (${f.url})`).join('\n');
	const result = await complete([
		{
			role: 'system',
			content:
				'You are Scribe, the synthesis agent of a research swarm. Write a concise, well-structured answer to the question using only the provided findings. Cite sources inline as [n] matching the numbered findings. Do not invent facts.',
		},
		{ role: 'user', content: `Question: ${objectives}\n\nFindings:\n${evidence}` },
	]);
	return result ? result.text : composeSummary(objectives, top);
}

const synthesize: SituationProcessor = {
	apply({ event, participant }: SituationContext): void {
		if (!(participant instanceof Agent)) return;
		const { runId } = event.payload as FindingVerified;
		const run = state().runs.get(runId);
		if (!run) return;

		// Keep a live draft as evidence accumulates.
		run.summary = composeSummary(run.objectives, topFindings(run.verified));

		const existing = settleTimers.get(runId);
		if (existing) clearTimeout(existing);
		settleTimers.set(
			runId,
			setTimeout(() => {
				void (async () => {
					const current = state().runs.get(runId);
					if (current && current.status === 'running') {
						const top = topFindings(current.verified);
						current.sources = top.map((f) => ({ title: f.title, url: f.url }));
						const answer = await writeAnswer(current.objectives, top);
						current.status = 'completed';
						current.completedAt = new Date().toISOString();
						current.summary = answer;
						sendEvent(
							SemanticEvent.create(RESEARCH_COMPLETED, participant.getId(), { runId, summary: answer }),
							participant.getId(),
						);
					}
					settleTimers.delete(runId);
				})();
			}, SETTLE_MS),
		);
	},
};

class OnFindingVerified extends SituationSpecification {
	isSatisfiedBy({ event, participant }: SituationContext): boolean {
		return event.type === FINDING_VERIFIED && event.producerId !== participant.getId();
	}
}

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
