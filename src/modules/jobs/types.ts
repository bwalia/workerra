export type EmploymentType = "full_time" | "part_time" | "contract" | "temporary" | "internship";
export type WorkplaceType = "onsite" | "hybrid" | "remote";

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string;
  period: "hour" | "day" | "year";
}

export interface Job {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string;
  workplace: WorkplaceType;
  employmentType: EmploymentType;
  salary: SalaryRange | null;
  description: string;
  requirements: string[];
  skills: string[];
  postedAt: string;
  closesAt: string | null;
  status: "draft" | "open" | "closed";
  /** Built-in test listing, not a real vacancy. */
  sample?: true;
}

export interface JobSearchFilters {
  q: string;
  location: string;
  workplace: WorkplaceType[];
  employmentType: EmploymentType[];
  page: number;
}

export interface JobSearchResult {
  jobs: Job[];
  total: number;
  page: number;
  pageCount: number;
}
