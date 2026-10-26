export type ApplicationMethod = "workerra" | "linkedin" | "ai_assisted";

export type ApplicationStatus = "draft" | "submitted" | "in_review" | "interview" | "offer" | "rejected" | "withdrawn";

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  method: ApplicationMethod;
  status: ApplicationStatus;
  cvId: string | null;
  coverLetter: string | null;
  submittedAt: string | null;
  updatedAt: string;
}
