import "server-only";
import { cookies } from "next/headers";
import { loadServerEnv } from "@/shared/config/env";
import { MAX_SEALED_LENGTH, seal, unseal } from "./seal";

// Authentication. Recruiters sign in with their OpsAPI account (see
// docs/architecture.md "Authentication"); the OpsAPI tokens live in an
// encrypted, httpOnly cookie, so the browser never sees them and OpsAPI stays
// the only place passwords are checked. Modules depend on this interface, not
// on OpsAPI's auth API directly. Candidates don't sign in (yet).

export type Role = "candidate" | "recruiter" | "admin";

export interface Session {
  /** The OpsAPI user's uuid. */
  userId: string;
  email: string;
  name: string;
  roles: Role[];
  /** OpsAPI credentials: server-side only, never pass to a client component. */
  opsapi: {
    token: string;
    refreshToken: string | null;
    /** When `token` expires (ms since epoch). */
    expiresAt: number;
  };
}

const SESSION_COOKIE = "workerra_session";
/** OpsAPI refresh tokens last 30 days; ask people to sign in again a little sooner. */
const SESSION_MAX_AGE_S = 14 * 24 * 60 * 60;

/** Whether this ring can sign people in at all (needs OpsAPI and SESSION_SECRET). */
export function authAvailable(): boolean {
  const env = loadServerEnv();
  return Boolean(env.opsapi && env.sessionSecret);
}

/** The signed-in user, or null. */
export async function getSession(): Promise<Session | null> {
  const secret = loadServerEnv().sessionSecret;
  if (!secret) return null;
  const session = unseal<Session>(cookies().get(SESSION_COOKIE)?.value, secret);
  return session?.userId && session.opsapi?.token ? session : null;
}

/** Store the session. Only from a server action or route handler (cookies are read-only while rendering). */
export function saveSession(session: Session): void {
  writeCookie(SESSION_COOKIE, session, SESSION_MAX_AGE_S);
}

export function clearSession(): void {
  cookies().delete(SESSION_COOKIE);
}

export function hasRole(session: Session | null, role: Role): boolean {
  return session?.roles.includes(role) ?? false;
}

/** A short-lived encrypted cookie, e.g. a sign-in that's waiting for its emailed code. */
export function writeCookie(name: string, value: unknown, maxAgeSeconds: number): void {
  const env = loadServerEnv();
  if (!env.sessionSecret) throw new Error("SESSION_SECRET is not set");
  const sealed = seal(value, env.sessionSecret);
  if (sealed.length > MAX_SEALED_LENGTH) throw new SessionTooLargeError();
  cookies().set(name, sealed, {
    httpOnly: true,
    sameSite: "lax",
    // Read at request time: int/test/acc/prod are https, local is plain http.
    secure: env.siteUrl.startsWith("https://"),
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function readCookie<T>(name: string): T | null {
  const secret = loadServerEnv().sessionSecret;
  return secret ? unseal<T>(cookies().get(name)?.value, secret) : null;
}

/** The account's OpsAPI token is too big to keep in a cookie (very many workspaces or permissions). */
export class SessionTooLargeError extends Error {
  constructor() {
    super("session too large for a cookie");
  }
}

/** A JWT's expiry (ms since epoch), or now if it has none we can read. */
export function tokenExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString()) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : Date.now();
  } catch {
    return Date.now();
  }
}
