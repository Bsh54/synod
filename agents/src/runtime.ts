// Mozaik runtime for the synod swarm.
// All agents share one event bus and one typed RuntimeState.

import { defineRuntime, RuntimeState } from '@mozaik-ai/core';
import type { ResearchRun } from './types';

export class ResearchState extends RuntimeState {
	// Every research run keyed by its id. Agents read and update this
	// shared state as events flow across the bus.
	runs = new Map<string, ResearchRun>();
}

export const {
	initializeRuntime,
	resolveRuntime,
	join,
	leave,
	sendEvent,
	runLoop,
} = defineRuntime<ResearchState>();

export function state(): ResearchState {
	return resolveRuntime().state;
}
