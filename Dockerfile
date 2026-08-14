FROM oven/bun:latest AS build
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
RUN bun --bun run build

FROM node:24-bookworm-slim AS production
WORKDIR /app

COPY --from=build /app/.output /app

# Backup/restore support: PostgreSQL clients and GnuPG for the tools/ scripts.
# The tools use portable Node APIs and only erasable TypeScript syntax, so
# Node 24 runs them directly via type stripping:
#   node /app/tools/backup.ts --yes --output /backups --no-env
#   node /app/tools/restore.ts /backups/<archive> --yes ...
#
# Debian bookworm's postgresql-client is PostgreSQL 15, which cannot dump
# servers >= 16. Install client 18 from the official PostgreSQL APT repo
# (PGDG); an 18.x client can dump/restore any server <= 18.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
        > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-18 gnupg \
    && rm -rf /var/lib/apt/lists/*
COPY tools/ /app/tools/

EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "/app/server/index.mjs"]
