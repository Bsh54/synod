// Tunable knobs for the swarm. Everything here is under our control, not the
// search provider's. Override any value from the environment.

function num(name: string, fallback: number): number {
	const v = process.env[name];
	const n = v ? Number(v) : NaN;
	return Number.isFinite(n) ? n : fallback;
}

export const config = {
	scouts: num('SYNOD_SCOUTS', 3), // number of parallel Legate agents
	subQuestions: num('SYNOD_SUBQUESTIONS', 5), // angles fanned out per run
	resultsPerQuery: num('SYNOD_RESULTS', 6), // results asked per search
	searchDepth: (process.env.SYNOD_SEARCH_DEPTH || 'advanced') as 'basic' | 'advanced',
	verifyThreshold: num('SYNOD_VERIFY_THRESHOLD', 0.4), // min score to accept a finding
	minVerified: num('SYNOD_MIN_VERIFIED', 6), // below this at settle, ask Legate for more
	maxFeedbackRounds: num('SYNOD_MAX_FEEDBACK', 2), // cap on backward requests per run
	topSources: num('SYNOD_TOP_SOURCES', 12), // sources handed to Scribe / cited
	settleMs: num('SYNOD_SETTLE_MS', 2500), // quiet window before sealing a run
};
