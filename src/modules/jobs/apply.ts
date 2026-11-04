"use server";

import { headers } from "next/headers";
import { loadServerEnv } from "@/shared/config/env";
import { logger } from "@/shared/logging";
import { clientKey, createRateLimiter } from "@/shared/security/rate-limit";
import { parseApplication } from "./application";
import { opsApiJobSource } from "./sources";

// The "Apply for this job" form's server action. The applicant becomes an ATS
// candidate with an application for the job, through Workerra's plugin and the
// server's own API key: applicants don't need an account.

export type ApplyFormState =
  | { status: "idle" }
  | { status: "applied"; email: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

// Per client, per replica: enough to stop a script flooding a job's pipeline.
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

export async function applyForJob(jobId: string, _prev: ApplyFormState, form: FormData): Promise<ApplyFormState> {
  // Bots fill every field; people never see this one.
  if (form.get("website")) return { status: "applied", email: String(form.get("email") ?? "") };

  const parsed = parseApplication(form);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted fields.", fieldErrors: parsed.errors };

  const { opsapi } = loadServerEnv();
  if (!opsapi) return { status: "error", message: "Applications aren’t open on Workerra yet." };

  if (!limiter.check(clientKey(headers())).allowed) {
    return { status: "error", message: "You’ve sent several applications in a short time. Try again in a few minutes." };
  }

  try {
    const result = await opsApiJobSource(opsapi).apply(jobId, parsed.application);
    switch (result.status) {
      case "applied":
        return { status: "applied", email: parsed.application.email };
      case "duplicate":
        return { status: "error", message: "You’ve already applied for this job with that email address." };
      case "not_found":
        return { status: "error", message: "This job has closed, so it isn’t taking applications any more." };
      case "invalid":
        return { status: "error", message: "Check the highlighted fields.", fieldErrors: result.errors };
    }
  } catch (err) {
    logger.error("job application failed", { error: err, jobId });
    return { status: "error", message: "We couldn’t send your application just now. Please try again in a moment." };
  }
}
