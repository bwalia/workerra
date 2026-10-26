# Workerra

- Run `npm run check` before pushing (typecheck, lint, tests). Run `npm run build` too when touching `next.config.mjs` or route segment config.
- Import modules only via `@/modules/<name>`; ESLint blocks deep imports. `src/app` is routing/composition only.
- One image is promoted int → test → acc → prod: never decide ring-specific behaviour at build time (`NEXT_PUBLIC_*`, `next.config` headers). Read `APP_ENV` at request time.
- AI features reuse JobShout services (see `docs/chatbot-reference.md`); don't add an LLM framework. Never modify the JobShout repo from here.
- OpsAPI is a SaaS product we consume: never change the OpsAPI repo, except its SDK (`sdk/typescript`, `@opsapi/client`) when it's genuinely missing something. Workerra's schema and custom endpoints live in this repo as an OpsAPI project plugin (`migrations/opsapi/`, `workerra_`-prefixed tables, idempotent, never OpsAPI-owned tables), run from a `FROM bwalia/opsapi` image, as `diy-tax-return-uk/migrations/opsapi` does. Call OpsAPI through `@opsapi/client`.
- Only `www.workerra.uk` is public; int/test/acc are VPN-only (`docs/environments.md`).
