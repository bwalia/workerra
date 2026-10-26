import { loadServerEnv } from "@/shared/config/env";
import { createLogger } from "./logger";

export { createLogger, redact, type Logger, type LogFields } from "./logger";

const env = loadServerEnv();

/** Process-wide server logger. Server code only. */
export const logger = createLogger(env.logLevel, { app: "workerra", env: env.appEnv });
