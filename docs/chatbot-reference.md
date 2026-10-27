# Chatbot reference: reusing JobShout's AI bot

Inspected read-only on 2026-10-22 from `/Users/balinderwalia/projects/jobshout`
(`bwalia/jobshout`). Nothing in JobShout was changed.

## Summary

JobShout has **two** bots. Workerra should reuse the first:

| | **A. "Recruiting" dock** (recommended) | B. Platform "JobShout AI" chat |
|---|---|---|
| Where | `jobshout-com/web/nextjs` (jobshout.com marketplace) | `server/` (Go) + `web/nextjs` (platform UI) |
| Audience | Public, anonymous candidates **and** recruiters | Signed-in platform users, org-scoped |
| Auth | None | JWT only — chat and career routes reject org API keys (`server/internal/middleware/apikey_auth.go` allow-list) |
| AI backend | NebulaDB `/api/v1/ai/chat` (cluster Ollama) + `/api/v1/ai/search` (hybrid) | Go LLM router (`server/internal/llm`, Ollama default, Claude/OpenAI/Gemini) + ReAct tool loop |
| Streaming | SSE frames over `fetch`; whole answer in one `text` event | SSE with real token deltas |
| Fit for Workerra | Same domain (job matching, apply-in-chat, lead capture), small, React-only | Ops/agent console; heavy coupling to platform hooks |

## A. Recruiting dock — what it is made of

UI (`jobshout-com/web/nextjs/components/job-support/`):
- `JobSupportProvider.tsx` (316 lines) — context + `useJobSupport()` →
  `{enabled, dockOpen, setDockOpen, busy, messages, send, reset, openForJob(jobId, title?)}`.
  Keeps session in `sessionStorage`, sends the last 10 messages as history,
  parses `data: {json}` SSE frames from `fetch().body.getReader()`.
- `JobSupportDock.tsx` (61) — floating launcher + dialog.
- `JobSupportPanel.tsx` (134) — message list, composer, match cards.
- Styling: Tailwind with JobShout theme tokens plus `.js-dock*` rules in `app/globals.css`.
- Deps: React and `next/link` only.

API (`app/api/job-support/chat/route.ts`, Next route handler, Node runtime):
- `GET /api/job-support/chat` → `{enabled}` (true when `NEBULA_URL` is set).
- `POST /api/job-support/chat` with `{message, session?, history?}` → `text/event-stream`
  events `session | status | matches | text | session_state | error | done`
  (`lib/job-support/events.ts`). 503 `JOB_SUPPORT_OFFLINE` when NebulaDB isn't configured.

Agent logic (`lib/job-support/`): `agent.ts` (turn logic, system prompt),
`nebuladb.ts` (chat, index, search), `crm.ts` (OpsAPI lead upsert), `pii.ts`
(redaction before storage), `types.ts`, `events.ts`. Applications are submitted to
the marketplace Rust API `POST /api/v1/jobs/{id}/applications`.

Env it needs: `NEBULA_URL`, `NEBULA_API_KEY`, `OPSAPI_URL`, `OPSAPI_NAMESPACE`,
`OPSAPI_API_KEY` (plus the marketplace API URL/internal token for applying).

## B. Platform chat — what may be reusable

- UI pieces that are self-contained enough to lift: `components/chat/Markdown.tsx`,
  `Composer.tsx`, `ThinkingIndicator.tsx`, `ToolCallChip.tsx`, `ConfirmationCard.tsx`,
  `ClarifyPrompt.tsx` (they pull in `react-markdown`, `remark-gfm`, `lucide-react`).
- Not portable: `ChatPage`, `ExecutionCard`, `WorkflowCard`, `ChatContextRail`
  (bound to platform hooks/stores).
- **Career Agent** (`server/internal/career`, `/api/v1/career/*`): CV extraction and
  tailoring, JD evaluation, cover letters, interview/offer prep, application
  tracker. Valuable for Workerra's AI-assisted applications, but JWT-only and
  per-user.
- Matching: `jobshout-com/crates/jobshout-matching` gives deterministic,
  explainable 0–100 scores (`GET /api/v1/profiles/{id}/matches`); the bot uses
  NebulaDB semantic search.

## Recommended approach for Workerra

1. **Port the dock UI** into `src/modules/chatbot/components/`, restyled with
   Workerra tokens. Replace the scaffold's placeholder `/chat` page with it and keep
   `ChatEntry` on the home page as the launcher.
2. **Port the server-side turn logic** (`lib/job-support/*`) into
   `src/modules/chatbot/server/` behind `src/app/api/chat/route.ts`, pointed at the
   same NebulaDB and OpsAPI services but with **Workerra's own** NebulaDB buckets,
   OpsAPI namespace, job source and system prompt. This reuses JobShout's AI
   services; it does not build a new framework.
3. **Do not** call `jobshout.com/api/job-support/chat` cross-origin: no CORS, no
   auth, no tenancy, and it would write into JobShout's buckets and CRM namespace.
4. **Career Agent later (phase 4):** call `/api/v1/career/*` from the Workerra server
   only. Needs a JobShout-side decision: a service identity per Workerra user, or
   adding career routes to the API-key allow-list. That is a JobShout change and
   should be raised there, not patched from Workerra.

## Implemented in Workerra (2026-10-22)

Workerra calls the same NebulaDB AI chat the dock uses; it does not run its own
LLM framework. Scope so far is conversation only.

```
browser ──POST /api/chat {message, history}──▶ Workerra route (src/app/api/chat)
            ◀── {data:{reply}} | {error} ──     └─ @/modules/chatbot/server (handleChatPost)
                                                   validate → rate limit → system prompt + history
                                                   └─ POST $NEBULA_URL/api/v1/ai/chat (Bearer NEBULA_API_KEY)
                                                       └─ ring LLM (cluster Ollama)
```

- `src/modules/chatbot/server/`: `nebula.ts` (client ported from the dock's
  `chat()`), `assistant.ts` (Workerra system prompt, history folding),
  `validation.ts`, `rate-limit.ts`, `handler.ts`. Marked `server-only`.
- `src/modules/chatbot/components/ChatPanel.tsx`: conversation on `/chat`; history
  in `sessionStorage`, last 10 messages sent per turn (server caps the same and
  trims to a 6,000-char budget). The home `ChatEntry` still hands off via `/chat?q=`.
- JSON response, not SSE: NebulaDB answers non-streaming and the dock also sends the
  whole answer in one event. Switch to `stream: true` if typing-style output is wanted.
- Refuses NebulaDB mock answers (`is_mock: true`) instead of showing them; upstream
  error text is logged server-side and never returned to the browser. Logs record
  sizes, timings and model, never message text.
- Rate limit: 20 requests/minute per client IP, in process memory (single replica).

### Guided journeys and guided mode (2026-10-27)

The assistant guides people through five journeys: find a job, hire someone,
create a candidate profile, apply for a job, contact the recruitment team
(`src/modules/chatbot/journeys.ts`).

- Each reply carries `{reply, mode, journey, actions, suggestions}`. The journey is
  detected deterministically (keywords, then the person's earlier messages), and
  it alone decides the links (`actions`, internal paths or `mailto:` only) and quick
  replies. The model writes the text; it is told not to write URLs.
- A job search becomes a `/jobs?q=&location=&workplace=&type=` link built from what
  the person said across the conversation.
- **Guided mode:** with no `NEBULA_URL`, or a NebulaDB that only has its mock LLM,
  the assistant answers from built-in guides (`server/guide.ts`) instead of going
  offline. Local development needs no secrets. Guides are honest that listings,
  profiles and applications are not live yet.
- `CONTACT_EMAIL` (optional, read at request time): the team inbox offered for the
  contact journey, in both modes. Unset → the assistant says there is no contact
  channel yet rather than inventing one.

Not ported yet: semantic job/candidate matching (`/api/v1/ai/search` needs a job
source), bucket writes, OpsAPI lead capture, apply-in-chat. Each needs a module that
does not exist yet.

### Running against a real LLM locally

The ring NebulaDBs are cluster-internal (`nebuladb.<ring>.svc.cluster.local:8080`).
Locally, run a NebulaDB from `~/projects/nebuladb` with local Ollama:

```bash
NEBULA_BIND=127.0.0.1:8090 NEBULA_API_KEYS=<local-key> \
NEBULA_LLM_OLLAMA_URL=http://127.0.0.1:11434 NEBULA_LLM_MODEL=qwen2.5:14b-instruct \
NEBULA_LLM_READ_TIMEOUT_SECS=180 ~/projects/nebuladb/target/debug/nebula-server
# then in .env.local:  NEBULA_URL=http://127.0.0.1:8090  NEBULA_API_KEY=<local-key>
```

Without `NEBULA_LLM_OLLAMA_URL`, NebulaDB falls back to its mock LLM and Workerra
answers in guided mode instead.

## Gaps to close while porting (do not copy as-is)

- No rate limiting, abuse protection or auth on the anonymous endpoint — add
  rate limiting before the assistant is public on www.
- No Langfuse tracing on the dock (the Go platform has it).
- Role/CV/name detection is regex-based.
- Re-indexes up to 25 jobs on every match request — index on job publish instead.
- JobShout-branded prompt and hard-coded bucket/namespace names.
- `NEBULA_*` variables are missing from jobshout-com's `.env.example`.
