# CampusGuard — production image
#
# Note on data sovereignty: this image runs the application. The DATABASE_URL it
# is given MUST point at a PostgreSQL instance hosted inside Ethiopia
# (Proclamation No. 1321/2024, Art. 22). See docs/03-operations/deployment.md.

FROM node:22-bookworm-slim AS base
ENV NODE_ENV=production
WORKDIR /srv/app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runtime
ENV PORT=3000
RUN groupadd --gid 10001 campusguard \
 && useradd --uid 10001 --gid campusguard --home /srv/app --shell /usr/sbin/nologin campusguard
COPY --from=deps /srv/app/node_modules ./node_modules
COPY --from=build /srv/app/.next ./.next
COPY --from=build /srv/app/public ./public
COPY --from=build /srv/app/package.json ./package.json
COPY --from=build /srv/app/db ./db
COPY --from=build /srv/app/scripts ./scripts
COPY --from=build /srv/app/node_modules/tsx ./node_modules/tsx
COPY --from=build /srv/app/src ./src
COPY --from=build /srv/app/tsconfig.json ./tsconfig.json

USER campusguard
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations are applied by the operator (npm run db:deploy) or an init container,
# never automatically on start — see docs/03-operations/runbook.md.
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
