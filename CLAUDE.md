# Workerra

- Run `npm run check` before pushing (typecheck, lint, tests). Run `npm run build` too when touching `next.config.mjs` or route segment config.
- Import modules only via `@/modules/<name>`; ESLint blocks deep imports. `src/app` is routing/composition only.
- One image is promoted int → test → acc → prod: never decide ring-specific behaviour at build time (`NEXT_PUBLIC_*`, `next.config` headers). Read `APP_ENV` at request time.
- AI features reuse JobShout services (see `docs/chatbot-reference.md`); don't add an LLM framework. Never modify the JobShout repo from here.
- Only `www.workerra.uk` is public; int/test/acc are VPN-only (`docs/environments.md`).
