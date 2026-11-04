"use client";

import { useFormState, useFormStatus } from "react-dom";
import { BUTTON_PRIMARY, FIELD_ERROR, INPUT } from "@/shared/ui";
import type { ApplyFormState } from "../apply";
import { APPLICATION_LIMITS } from "../application";

type Action = (prev: ApplyFormState, form: FormData) => Promise<ApplyFormState>;

/** "Apply for this job": works without an account; the details go to the recruiter through the ATS. */
export function ApplyForm({ action, jobTitle }: { action: Action; jobTitle: string }) {
  const [state, formAction] = useFormState(action, { status: "idle" });

  if (state.status === "applied") {
    return (
      <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-500/40 dark:bg-emerald-500/10">
        <h3 className="font-semibold text-ink">Application sent</h3>
        <p className="mt-2 text-body">
          Your application for {jobTitle} has gone to the recruiter. They&rsquo;ll contact you at {state.email} if they want
          to take it further.
        </p>
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.status === "error" && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {state.message}
        </p>
      )}
      <Field label="Full name" name="name" error={errors.name}>
        <input id="apply-name" name="name" autoComplete="name" required maxLength={APPLICATION_LIMITS.name} className={INPUT} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "apply-name-error" : undefined} />
      </Field>
      <Field label="Email" name="email" error={errors.email}>
        <input id="apply-email" name="email" type="email" autoComplete="email" required maxLength={APPLICATION_LIMITS.email} className={INPUT} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "apply-email-error" : undefined} />
      </Field>
      <Field label="Phone (optional)" name="phone" error={errors.phone}>
        <input id="apply-phone" name="phone" type="tel" autoComplete="tel" maxLength={APPLICATION_LIMITS.phone} className={INPUT} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "apply-phone-error" : undefined} />
      </Field>
      <Field label="Links to your CV, LinkedIn or portfolio (optional, one per line)" name="links" error={errors.links}>
        <textarea id="apply-links" name="links" rows={2} placeholder="https://www.linkedin.com/in/your-name" className={INPUT} aria-invalid={Boolean(errors.links)} aria-describedby={errors.links ? "apply-links-error" : undefined} />
      </Field>
      <Field label="Cover letter (optional)" name="cover_letter" error={errors.cover_letter}>
        <textarea id="apply-cover_letter" name="cover_letter" rows={8} maxLength={APPLICATION_LIMITS.coverLetter} placeholder="Why this role, and where your experience matches what they need." className={INPUT} aria-invalid={Boolean(errors.cover_letter)} aria-describedby={errors.cover_letter ? "apply-cover_letter-error" : undefined} />
      </Field>
      {/* Left empty by people, filled by bots. */}
      <div aria-hidden className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-sm text-muted">
        Your details go only to the recruiter for this job. Don&rsquo;t include bank details or ID documents.
      </p>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({ label, name, error, children }: { label: string; name: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`apply-${name}`} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`apply-${name}-error`} className={FIELD_ERROR}>
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
      {pending ? "Sending…" : "Send application"}
    </button>
  );
}
