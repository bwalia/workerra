export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  /** Terminal stages close the application (hired, rejected). */
  terminal: boolean;
}

export const DEFAULT_STAGES: readonly PipelineStage[] = [
  { id: "applied", name: "Applied", order: 1, terminal: false },
  { id: "screening", name: "Screening", order: 2, terminal: false },
  { id: "interview", name: "Interview", order: 3, terminal: false },
  { id: "offer", name: "Offer", order: 4, terminal: false },
  { id: "hired", name: "Hired", order: 5, terminal: true },
  { id: "rejected", name: "Rejected", order: 6, terminal: true },
];

export interface PipelineEntry {
  applicationId: string;
  jobId: string;
  stageId: string;
  movedAt: string;
  movedBy: string;
}
