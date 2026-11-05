"use client";

import { useFormState, useFormStatus } from "react-dom";
import { EMPLOYMENT_LABELS, SECTOR_LABELS, WORKPLACE_LABELS } from "@/modules/jobs";
import { BUTTON_PRIMARY, FIELD_ERROR, INPUT } from "@/shared/ui";
import { postJob, type PostJobState } from "../actions";
import type { JobFormField } from "../job-form";

/** Publishes a vacancy: an ATS job in the Workerra workspace plus its listing on the jobs board. */
export function PostJobForm({ today }: { today: string }) {
  const [state, action] = useFormState(postJob, {} as PostJobState);
  const errors = state.fieldErrors ?? {};
  const field = (name: JobFormField) => ({
    id: `job-${name}`,
    name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `job-${name}-error` : undefined,
  });

  return (
    <form action={action} className="grid gap-6" noValidate>
      {state.error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {state.error}
        </p>
      )}

      <Group title="The role">
        <Field label="Job title" name="title" errors={errors}>
          <input {...field("title")} required maxLength={200} placeholder="e.g. Warehouse Operative" className={INPUT} />
        </Field>
        <Field label="Company or organisation" name="company" errors={errors}>
          <input {...field("company")} required maxLength={200} autoComplete="organization" className={INPUT} />
        </Field>
        <Field label="Location" name="location" errors={errors}>
          <input {...field("location")} required maxLength={200} placeholder="Town or city, e.g. Leeds" className={INPUT} />
        </Field>
        <Field label="Sector" name="sector" errors={errors}>
          <select {...field("sector")} required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Choose a sector
            </option>
            {Object.entries(SECTOR_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contract type" name="employment_type" errors={errors}>
          <select {...field("employment_type")} required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Choose a contract type
            </option>
            {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Workplace" name="workplace" errors={errors}>
          <select {...field("workplace")} required defaultValue="" className={INPUT}>
            <option value="" disabled>
              Choose where the work is done
            </option>
            {Object.entries(WORKPLACE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </Group>

      <Group title="Pay (optional, but listings with pay get more applications)">
        <Field label="Minimum (£)" name="salary_min" errors={errors}>
          <input {...field("salary_min")} inputMode="decimal" placeholder="e.g. 24000" className={INPUT} />
        </Field>
        <Field label="Maximum (£)" name="salary_max" errors={errors}>
          <input {...field("salary_max")} inputMode="decimal" placeholder="e.g. 27000" className={INPUT} />
        </Field>
        <Field label="Per" name="salary_period" errors={errors}>
          <select {...field("salary_period")} defaultValue="year" className={INPUT}>
            <option value="year">Year</option>
            <option value="day">Day</option>
            <option value="hour">Hour</option>
          </select>
        </Field>
      </Group>

      <Group title="Details" wide>
        <Field label="About the role" name="description" errors={errors}>
          <textarea {...field("description")} required rows={6} maxLength={20000} className={INPUT} />
        </Field>
        <Field label="What they’ll do (one per line, optional)" name="responsibilities" errors={errors}>
          <textarea {...field("responsibilities")} rows={4} className={INPUT} />
        </Field>
        <Field label="What they’ll need (one per line)" name="requirements" errors={errors}>
          <textarea {...field("requirements")} required rows={4} className={INPUT} />
        </Field>
        <Field label="What’s on offer (one per line, optional)" name="benefits" errors={errors}>
          <textarea {...field("benefits")} rows={3} className={INPUT} />
        </Field>
        <Field label="Skills (comma-separated, optional)" name="skills" errors={errors}>
          <input {...field("skills")} placeholder="e.g. Forklift, Stock control" className={INPUT} />
        </Field>
        <Field label="Closing date (optional: leave empty to keep it open until you close it)" name="closes_at" errors={errors}>
          <input {...field("closes_at")} type="date" min={today} className={INPUT} />
        </Field>
      </Group>

      <p className="text-sm text-muted">
        The job goes live on Workerra as soon as you publish it, and applications arrive in your workspace&rsquo;s ATS.
      </p>
      <div>
        <Publish />
      </div>
    </form>
  );
}

function Group({ title, wide = false, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-line bg-surface p-5">
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      <div className={`grid gap-4 ${wide ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: JobFormField;
  errors: Partial<Record<JobFormField, string>>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`job-${name}`} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {errors[name] && (
        <p id={`job-${name}-error`} className={FIELD_ERROR}>
          {errors[name]}
        </p>
      )}
    </div>
  );
}

function Publish() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
      {pending ? "Publishing…" : "Publish job"}
    </button>
  );
}
