import type { EmploymentType, WorkplaceType } from "@/modules/jobs";

export interface CandidatePreferences {
  roles: string[];
  locations: string[];
  workplace: WorkplaceType[];
  employmentTypes: EmploymentType[];
  minSalary: number | null;
  openToWork: boolean;
}

export interface CandidateCv {
  id: string;
  fileName: string;
  uploadedAt: string;
  /** Plain text extracted for matching; never the raw file. */
  extractedText: string | null;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  fullName: string;
  headline: string;
  location: string;
  skills: string[];
  linkedinUrl: string | null;
  cvs: CandidateCv[];
  preferences: CandidatePreferences;
}
