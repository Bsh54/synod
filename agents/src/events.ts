// Semantic event vocabulary shared by every agent on the bus.
// Coordination is these events firing concurrently, with no central scheduler.
// The loop is not one-way: Scribe can push coverage.low back to the Legates.

import type { Finding, VerifiedFinding } from './types';

export const RESEARCH_REQUESTED = 'research.requested';
export const SEARCH_REQUESTED = 'search.requested';
export const FINDING_PRODUCED = 'finding.produced';
export const FINDING_VERIFIED = 'finding.verified';
export const FINDING_REJECTED = 'finding.rejected';
export const COVERAGE_LOW = 'coverage.low';
export const RESEARCH_COMPLETED = 'research.completed';

export interface ResearchRequested {
	runId: string;
	question: string;
}

export interface SearchRequested {
	runId: string;
	query: string;
	lane: number;
}

export interface FindingProduced {
	runId: string;
	finding: Finding;
}

export interface FindingVerified {
	runId: string;
	finding: VerifiedFinding;
}

export interface FindingRejected {
	runId: string;
	finding: Finding;
	reason: string;
}

// Backward edge: synthesis asks discovery for more on a weak area.
export interface CoverageLow {
	runId: string;
	query: string;
	round: number;
}

export interface ResearchCompleted {
	runId: string;
	summary: string;
}
