export type EmploymentType = "full_time" | "part_time" | "contract" | "temporary" | "internship";
export type WorkplaceType = "onsite" | "hybrid" | "remote";
export type JobSector =
  | "technology"
  | "healthcare"
  | "education"
  | "finance"
  | "logistics"
  | "customer_service"
  | "construction"
  | "marketing"
  | "hospitality_retail"
  | "admin";

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
  sector: JobSector;
  salary: SalaryRange | null;
  description: string;
  /** What the person will do day to day, when the listing says. */
  responsibilities?: string[];
  requirements: string[];
  /** Pay extras, leave, training and the like, when the listing says. */
  benefits?: string[];
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
  sector: JobSector | null;
  page: number;
}

export interface JobSearchResult {
  jobs: Job[];
  total: number;
  page: number;
  pageCount: number;
}
