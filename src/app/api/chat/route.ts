import { notImplemented } from "@/shared/api";
import { logger } from "@/shared/logging";

// Will proxy to the JobShout chat API (docs/chatbot-reference.md) so the
// JobShout credential stays server-side. Not implemented in the scaffold.
export function POST() {
  logger.info("chat request before integration", { module: "chatbot" });
  return notImplemented("The Workerra assistant");
}
