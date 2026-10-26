import type { LogLevel } from "@/shared/config/env";

// Structured JSON logs on stdout, one line per event, so the cluster log
// pipeline can parse them. Sensitive keys are redacted before serialising.

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const REDACT = /pass(word)?|secret|token|authorization|cookie|api[-_]?key/i;

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export function createLogger(
  level: LogLevel = "info",
  base: LogFields = {},
  write: (line: string) => void = (line) => process.stdout.write(line + "\n"),
): Logger {
  const emit = (lvl: LogLevel, msg: string, fields?: LogFields) => {
    if (ORDER[lvl] < ORDER[level]) return;
    const entry = { time: new Date().toISOString(), level: lvl, msg, ...redact({ ...base, ...fields }) };
    write(JSON.stringify(entry));
  };
  return {
    debug: (msg, fields) => emit("debug", msg, fields),
    info: (msg, fields) => emit("info", msg, fields),
    warn: (msg, fields) => emit("warn", msg, fields),
    error: (msg, fields) => emit("error", msg, fields),
    child: (fields) => createLogger(level, { ...base, ...fields }, write),
  };
}

export function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACT.test(key)) out[key] = "[redacted]";
    else if (value instanceof Error) out[key] = { name: value.name, message: value.message };
    else if (value && typeof value === "object" && !Array.isArray(value)) out[key] = redact(value as LogFields);
    else out[key] = value;
  }
  return out;
}
