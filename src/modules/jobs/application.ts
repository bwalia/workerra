import type { ApiApplicationInput } from "./opsapi-types";

// Checks an application form before it goes to OpsAPI, so people get a clear
// message per field. The plugin validates again; these limits match it.

export const APPLICATION_LIMITS = { name: 200, email: 254, phone: 40, coverLetter: 8000, links: 5 } as const;

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export type ParsedApplication =
  | { ok: true; application: ApiApplicationInput }
  | { ok: false; errors: Record<string, string> };

export function parseApplication(form: FormData): ParsedApplication {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const name = text("name");
  const email = text("email").toLowerCase();
  const phone = text("phone");
  const coverLetter = text("cover_letter");
  const links = text("links")
    .split(/\s+/)
    .filter(Boolean);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter your name.";
  else if (name.length > APPLICATION_LIMITS.name) errors.name = "Use a shorter name.";
  if (!EMAIL.test(email) || email.length > APPLICATION_LIMITS.email) errors.email = "Enter an email address, like name@example.com.";
  if (phone.length > APPLICATION_LIMITS.phone) errors.phone = "Use a shorter phone number.";
  if (coverLetter.length > APPLICATION_LIMITS.coverLetter)
    errors.cover_letter = `Keep it under ${APPLICATION_LIMITS.coverLetter.toLocaleString("en-GB")} characters.`;
  if (links.length > APPLICATION_LIMITS.links) errors.links = `Add up to ${APPLICATION_LIMITS.links} links.`;
  else if (links.some((l) => !isHttpUrl(l))) errors.links = "Each link must start with https:// (or http://).";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    application: {
      name,
      email,
      ...(phone && { phone }),
      ...(coverLetter && { cover_letter: coverLetter }),
      ...(links.length > 0 && { links }),
    },
  };
}

function isHttpUrl(value: string): boolean {
  if (value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
