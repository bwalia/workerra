import "server-only";

// Server entry of the chatbot module (route handlers and server components).
// Kept apart from ../index.ts so client bundles never pull in env or secrets.

export { assistantEnabled, handleChatPost } from "./handler";
