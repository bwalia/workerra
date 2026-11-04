"use server";

import { createClient, OpsApiError, type LoginSuccess } from "@opsapi/client";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SessionTooLargeError,
  clearSession,
  getSession,
  readCookie,
  saveSession,
  tokenExpiry,
  writeCookie,
} from "@/shared/auth";
import { loadServerEnv } from "@/shared/config/env";
import { logger } from "@/shared/logging";
import { clientKey, createRateLimiter } from "@/shared/security/rate-limit";
import { parseJobForm, type JobFormField } from "./job-form";
import type { AtsJobStatus } from "./opsapi-types";
import { safeNext } from "./next-path";
import { renewOnUnauthorized, requireRecruiter } from "./server";

// Server actions for recruiter sign-in and job management. Passwords and codes
// go straight to OpsAPI; Workerra only keeps the tokens OpsAPI hands back, in an
// encrypted httpOnly cookie (src/shared/auth).

export type SignInState =
  | { step: "password"; error?: string }
  | { step: "code"; email: string; error?: string };

export type PostJobState = { error?: string; fieldErrors?: Partial<Record<JobFormField, string>> };

const SIGN_IN_COOKIE = "workerra_signin";
const log = logger.child({ module: "recruitment" });
// On top of OpsAPI's own per-account lockout: per client, per replica.
const signInLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 });

interface PendingSignIn {
  sessionToken: string;
  email: string;
  next: string;
}

function opsapiConfig() {
  const { opsapi, sessionSecret } = loadServerEnv();
  return opsapi && sessionSecret ? opsapi : null;
}

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const opsapi = opsapiConfig();
  if (!opsapi) return { step: "password", error: "Recruiter sign-in isn’t available on this site yet." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));
  if (!email || !password) return { step: "password", error: "Enter your email address and password." };
  if (!signInLimiter.check(clientKey(headers())).allowed) {
    return { step: "password", error: "Too many sign-in attempts. Wait a few minutes and try again." };
  }

  let result;
  try {
    result = await createClient({ baseUrl: opsapi.url, timeoutMs: 8000 }).auth.login({ username: email, password });
  } catch (err) {
    return { step: "password", error: signInError(err, "password") };
  }
  if (result.status === "needs_2fa") {
    writeCookie(SIGN_IN_COOKIE, { sessionToken: result.sessionToken, email, next } satisfies PendingSignIn, 10 * 60);
    return { step: "code", email };
  }
  const error = finishSignIn(result, opsapi.namespace);
  if (error) return { step: "password", error };
  redirect(next);
}

export async function verifyCode(_prev: SignInState, form: FormData): Promise<SignInState> {
  const opsapi = opsapiConfig();
  const pending = readCookie<PendingSignIn>(SIGN_IN_COOKIE);
  if (!opsapi || !pending) return { step: "password", error: "That sign-in has expired. Enter your password again." };
  const code = String(form.get("code") ?? "").replace(/\s+/g, "");
  if (!code) return { step: "code", email: pending.email, error: "Enter the code from the email." };
  if (!signInLimiter.check(clientKey(headers())).allowed) {
    return { step: "code", email: pending.email, error: "Too many attempts. Wait a few minutes and try again." };
  }

  let result;
  try {
    result = await createClient({ baseUrl: opsapi.url, timeoutMs: 8000 }).auth.verify2fa({ sessionToken: pending.sessionToken, code });
  } catch (err) {
    return { step: "code", email: pending.email, error: signInError(err, "code") };
  }
  const error = finishSignIn(result, opsapi.namespace);
  cookies().delete(SIGN_IN_COOKIE);
  if (error) return { step: "password", error };
  redirect(pending.next);
}

/** Keeps the session when the account belongs to Workerra's workspace; otherwise says why not. */
function finishSignIn(result: LoginSuccess, namespace: string): string | null {
  const member = result.namespaces.some((ns) => ns.slug === namespace || ns.uuid === namespace);
  if (!member) {
    log.warn("sign-in refused: not a member of the workspace", { user: result.user.uuid });
    return "This account isn’t set up as a Workerra recruiter. Ask your Workerra contact to invite you.";
  }
  const name = [result.user.first_name, result.user.last_name].filter(Boolean).join(" ").trim();
  try {
    saveSession({
      userId: result.user.uuid,
      email: result.user.email,
      name: name || result.user.email,
      roles: ["recruiter"],
      opsapi: { token: result.token, refreshToken: result.refreshToken ?? null, expiresAt: tokenExpiry(result.token) },
    });
  } catch (err) {
    if (err instanceof SessionTooLargeError) {
      log.error("sign-in refused: OpsAPI token too large for the session cookie", { user: result.user.uuid });
      return "We couldn’t sign you in: this account has access to too many workspaces. Contact Workerra support.";
    }
    throw err;
  }
  log.info("recruiter signed in", { user: result.user.uuid });
  return null;
}

function signInError(err: unknown, step: "password" | "code"): string {
  if (err instanceof OpsApiError) {
    if (err.status === 429 || err.status === 423) return "Too many attempts. Wait a few minutes and try again.";
    if (err.status === 403) return "This account has been deactivated.";
    if (err.status === 400 || err.status === 401) {
      return step === "code" ? "That code isn’t right, or it has expired." : "That email address and password don’t match.";
    }
  }
  log.error("recruiter sign-in failed", { error: err, step });
  return "We couldn’t reach the sign-in service. Please try again in a moment.";
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  const opsapi = opsapiConfig();
  if (session?.opsapi.refreshToken && opsapi) {
    // Revoke it in OpsAPI too; the cookie goes either way.
    await createClient({ baseUrl: opsapi.url, timeoutMs: 5000 })
      .auth.logout(session.opsapi.refreshToken)
      .catch((err) => log.warn("sign-out: couldn't revoke the refresh token", { error: err }));
  }
  clearSession();
  redirect("/recruiters");
}

export async function postJob(_prev: PostJobState, form: FormData): Promise<PostJobState> {
  const { opsapi } = await requireRecruiter("/recruiters/jobs/new");
  const parsed = parseJobForm(form, new Date().toISOString().slice(0, 10));
  if (!parsed.ok) return { error: "Check the highlighted fields.", fieldErrors: parsed.errors };

  let uuid: string;
  try {
    const { data } = await opsapi.POST("/api/v2/ats/jobs", { body: parsed.job });
    uuid = data!.data.uuid;
  } catch (err) {
    renewOnUnauthorized(err, "/recruiters/jobs/new");
    return { error: actionError(err, "post the job") };
  }
  try {
    await opsapi.PUT("/api/v2/workerra/jobs/{uuid}/listing", { params: { path: { uuid } }, body: parsed.listing });
  } catch (err) {
    // Don't leave an open ATS job with no listing behind.
    await opsapi.PUT("/api/v2/ats/jobs/{uuid}", { params: { path: { uuid } }, body: { status: "closed" } }).catch(() => undefined);
    renewOnUnauthorized(err, "/recruiters/jobs/new");
    if (err instanceof OpsApiError && err.status === 422) {
      return { error: "Check the highlighted fields.", fieldErrors: (err.details ?? {}) as PostJobState["fieldErrors"] };
    }
    return { error: actionError(err, "publish the listing") };
  }
  log.info("job posted", { job: uuid });
  revalidatePath("/recruiters");
  redirect(`/recruiters/jobs/${uuid}?posted=1`);
}

/** Close, pause or reopen one of the workspace's jobs (its ATS status decides whether it's listed). */
export async function setJobStatus(jobId: string, status: AtsJobStatus): Promise<{ error?: string }> {
  const path = `/recruiters/jobs/${jobId}`;
  const { opsapi } = await requireRecruiter(path);
  if (!["open", "paused", "closed"].includes(status)) return { error: "Unknown status." };
  try {
    await opsapi.PUT("/api/v2/ats/jobs/{uuid}", { params: { path: { uuid: jobId } }, body: { status } });
  } catch (err) {
    renewOnUnauthorized(err, path);
    return { error: actionError(err, "change the job") };
  }
  log.info("job status changed", { job: jobId, status });
  revalidatePath(path);
  revalidatePath("/recruiters");
  return {};
}

function actionError(err: unknown, doing: string): string {
  if (err instanceof OpsApiError && err.isForbidden) {
    return `Your role in the Workerra workspace doesn’t allow you to ${doing}. Ask the workspace owner for access.`;
  }
  if (err instanceof OpsApiError && err.isNotFound) return "That job doesn’t exist any more.";
  log.error(`couldn't ${doing}`, { error: err });
  return `We couldn’t ${doing} just now. Please try again in a moment.`;
}
