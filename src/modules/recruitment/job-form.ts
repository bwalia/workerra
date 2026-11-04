import { EMPLOYMENT_LABELS, SECTOR_LABELS, WORKPLACE_LABELS } from "@/modules/jobs";
import type { EmploymentType, JobSector, WorkplaceType } from "@/modules/jobs";
import type { AtsJobInput, ListingInput } from "./opsapi-types";

// The "Post a job" form: checked here so the recruiter gets a message per field,
// then split into the ATS job (title, location, type, description, status) and
// Workerra's listing (everything a job board adds). OpsAPI validates again.

export type JobFormField =
  | "title"
  | "company"
  | "location"
  | "employment_type"
  | "workplace"
  | "sector"
  | "salary_min"
  | "salary_max"
  | "salary_period"
  | "description"
  | "responsibilities"
  | "requirements"
  | "benefits"
  | "skills"
  | "closes_at";

export type ParsedJobForm =
  | { ok: true; job: AtsJobInput; listing: ListingInput }
  | { ok: false; errors: Partial<Record<JobFormField, string>> };

const MAX_ITEMS = 30;

/** `today` is YYYY-MM-DD, for the closing-date check (passed in so tests are stable). */
export function parseJobForm(form: FormData, today: string): ParsedJobForm {
  const text = (key: JobFormField) => String(form.get(key) ?? "").trim();
  const errors: Partial<Record<JobFormField, string>> = {};

  const required = (key: JobFormField, label: string, max: number) => {
    const v = text(key);
    if (!v) errors[key] = `Enter the ${label}.`;
    else if (v.length > max) errors[key] = `Keep the ${label} under ${max} characters.`;
    return v;
  };
  const title = required("title", "job title", 200);
  const company = required("company", "company or organisation name", 200);
  const location = required("location", "location", 200);
  const description = required("description", "job description", 20000);

  const choice = <T extends string>(key: JobFormField, labels: Record<T, string>, message: string): T => {
    const v = text(key);
    if (!(v in labels)) errors[key] = message;
    return v as T;
  };
  const employment_type = choice<EmploymentType>("employment_type", EMPLOYMENT_LABELS, "Choose the contract type.");
  const workplace = choice<WorkplaceType>("workplace", WORKPLACE_LABELS, "Choose where the work is done.");
  const sector = choice<JobSector>("sector", SECTOR_LABELS, "Choose a sector.");

  const money = (key: JobFormField) => {
    const v = text(key).replace(/[£,\s]/g, "");
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) {
      errors[key] = "Enter an amount in pounds, like 32000 or 13.50.";
      return undefined;
    }
    return Math.round(n * 100) / 100;
  };
  const salary_min = money("salary_min");
  const salary_max = money("salary_max");
  const period = text("salary_period");
  if ((salary_min !== undefined || salary_max !== undefined) && !["hour", "day", "year"].includes(period)) {
    errors.salary_period = "Say whether the pay is per hour, day or year.";
  }
  if (salary_min !== undefined && salary_max !== undefined && salary_min > salary_max) {
    errors.salary_max = "The maximum can't be less than the minimum.";
  }

  const list = (key: JobFormField, splitOnCommas = false) => {
    const items = text(key)
      .split(splitOnCommas ? /[\n,]/ : /\n/)
      .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean);
    if (items.length > MAX_ITEMS) errors[key] = `Use at most ${MAX_ITEMS} items.`;
    if (items.some((item) => item.length > 300)) errors[key] = "Keep each item under 300 characters.";
    return items;
  };
  const responsibilities = list("responsibilities");
  const requirements = list("requirements");
  const benefits = list("benefits");
  const skills = list("skills", true);
  if (requirements.length === 0) errors.requirements = "Add at least one requirement, one per line.";

  const closes = text("closes_at");
  if (closes && (!/^\d{4}-\d{2}-\d{2}$/.test(closes) || Number.isNaN(Date.parse(closes)))) {
    errors.closes_at = "Enter a date.";
  } else if (closes && closes < today) {
    errors.closes_at = "The closing date can't be in the past.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const hasPay = salary_min !== undefined || salary_max !== undefined;
  return {
    ok: true,
    job: { title, location, employment_type, description, status: "open" },
    listing: {
      company,
      workplace,
      sector,
      ...(salary_min !== undefined && { salary_min }),
      ...(salary_max !== undefined && { salary_max }),
      ...(hasPay && { salary_currency: "GBP", salary_period: period as "hour" | "day" | "year" }),
      responsibilities,
      requirements,
      benefits,
      skills,
      ...(closes && { closes_at: closes }),
    },
  };
}
