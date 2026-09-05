// Shared domain types for the synod research swarm.

export interface Finding {
	id: string;
	runId: string;
	query: string;
	title: string;
	url: string;
	snippet: string;
}

export interface VerifiedFinding extends Finding {
	score: number;
}

export type RunStatus = 'running' | 'completed' | 'failed';

export interface ResearchRun {
	questId: string;
	objectives: string;
	status: RunStatus;
	findings: Finding[];
	verified: VerifiedFinding[];
	rejected: number;
	summary?: string;
	sources?: { title: string; url: string }[];
	feedbackRounds: number;
	timeline: TimelineMark[];
	createdAt: string;
	completedAt?: string;
}

export interface TimelineMark {
	t: number; // ms epoch
	agent: string; // Legate-0, Assessor, Scribe, Planner
	kind: string; // search | finding | verified | rejected | feedback | synthesize | complete
}
