import type { MetadataRoute } from "next";
import { ENVIRONMENTS } from "@/shared/config/environments";
import { loadServerEnv } from "@/shared/config/env";

// Evaluated per request: the same image runs in every ring, and only prod may be indexed.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const env = loadServerEnv();
  if (!ENVIRONMENTS[env.appEnv].indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/chat"] } };
}
