export interface MatchReason {
  label: string;
  weight: number;
}

/** A score produced by a JobShout matching agent; Workerra stores and displays it. */
export interface MatchResult {
  candidateId: string;
  jobId: string;
  /** 0–100. */
  score: number;
  reasons: MatchReason[];
  agentRunId: string | null;
  computedAt: string;
}
