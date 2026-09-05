// Wires the swarm together: one runtime, one coordinator, three agents,
// all sharing the event bus. startRun broadcasts a research request that
// the agents pick up and act on concurrently.

import { SemanticEvent, createHuman, type Human } from '@mozaik-ai/core';
import { initializeRuntime, join, sendEvent, state, ResearchState } from './runtime';
import { RESEARCH_REQUESTED } from './events';
import { createLegate } from './agents/legate';
import { createAssessor } from './agents/assessor';
import { createScribe } from './agents/scribe';
import { buildSupportedModels } from './inference';
import type { ResearchRun } from './types';

let coordinator: Human;
let started = false;

export function initSwarm(): void {
	if (started) return;
	const supportedModels = buildSupportedModels();
	initializeRuntime({
		state: new ResearchState(),
		inferenceRunnerConfig: supportedModels.length ? { supportedModels } : undefined,
	});
	coordinator = createHuman({ name: 'Coordinator', capabilities: [], handlers: [] });
	join(coordinator);
	join(createLegate());
	join(createAssessor());
	join(createScribe());
	started = true;
}

export function startRun(question: string): string {
	const runId = 'run_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
	const run: ResearchRun = {
		questId: runId,
		objectives: question,
		status: 'running',
		findings: [],
		verified: [],
		rejected: 0,
		createdAt: new Date().toISOString(),
	};
	state().runs.set(runId, run);
	sendEvent(
		SemanticEvent.create(RESEARCH_REQUESTED, coordinator.getId(), { runId, question }),
		coordinator.getId(),
	);
	return runId;
}

export function listRuns(): ResearchRun[] {
	return [...state().runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRun(id: string): ResearchRun | undefined {
	return state().runs.get(id);
}
