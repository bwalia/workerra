import { ok } from "@/shared/api";
import { loadServerEnv } from "@/shared/config/env";

export const dynamic = "force-dynamic";

// Liveness probe for Kubernetes and the edge health check.
export function GET() {
  return ok({ status: "ok", env: loadServerEnv().appEnv, version: process.env.APP_VERSION ?? "dev" });
}
