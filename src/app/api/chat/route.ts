import { handleChatPost } from "@/modules/chatbot/server";

// Workerra assistant: proxies to NebulaDB AI chat so the credential stays server-side.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = handleChatPost;
