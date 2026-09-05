// Semantic event vocabulary shared by every agent on the bus.
// The whole coordination story is these five event types firing
// concurrently, with no central scheduler deciding the order.

import type { Finding, VerifiedFinding } from './types';

export const RESEARCH_REQUESTED = 'research.requested';
export const FINDING_PRODUCED = 'finding.produced';
export const FINDING_VERIFIED = 'finding.verified';
export const FINDING_REJECTED = 'finding.rejected';
export const RESEARCH_COMPLETED = 'research.completed';

export interface ResearchRequested {
	runId: string;
	question: string;
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

export interface ResearchCompleted {
	runId: string;
	summary: string;
}
