FROM oven/bun:latest AS build
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
RUN bun --bun run build

FROM oven/bun:slim AS production
WORKDIR /app

COPY --from=build /app/.output /app

EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

ENTRYPOINT ["bun", "--bun", "run", "/app/server/index.mjs"]
