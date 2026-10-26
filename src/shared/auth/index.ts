// Authentication contract. No provider is wired yet (see docs/architecture.md
// "Authentication"); modules depend on this interface, not on a provider SDK,
// so the provider can be chosen in phase 2 without touching module code.

export type Role = "candidate" | "recruiter" | "admin";

export interface Session {
  userId: string;
  email: string;
  roles: Role[];
}

/** Returns the signed-in user. Always null until an auth provider is wired. */
export async function getSession(): Promise<Session | null> {
  return null;
}

export function hasRole(session: Session | null, role: Role): boolean {
  return session?.roles.includes(role) ?? false;
}
