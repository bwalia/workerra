# Workerra web image. One image is promoted int → test → acc → prod, so nothing
# ring-specific is baked in: the ring comes from APP_ENV and secrets from WSL
# Vault (via External Secrets) at runtime. APP_VERSION is set by the Helm chart
# to the image tag, which /api/health reports for Ring Promoter's version check.
#
# Build stages run on the builder's architecture and only the runtime stage on
# the target's, as in jobshout/web/nextjs/Dockerfile: Next's standalone output is
# pure JavaScript, so nothing native needs emulating. If a native dependency
# (e.g. sharp) is ever added, build on the target platform instead.
FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# `next build` exiting 0 doesn't prove it wrote the standalone bundle.
RUN test -f .next/standalone/server.js && test -d .next/static

FROM --platform=$TARGETPLATFORM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Standalone output leaves out public/ (site photos), so copy it in alongside.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
