# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:latest AS build
WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

COPY package.json bun.lock* ./

# use ignore-scripts to avoid builting node modules like better-sqlite3
RUN bun install --frozen-lockfile --ignore-scripts

# Copy the entire project
COPY . .

# Generate Prisma client (required before building the app)
# Uses bunx which is available in the Bun image to run Prisma CLI
# Inject binary targets for production (debian-openssl-3.0.x)
RUN sed -i 's/provider = "prisma-client-js"/provider = "prisma-client-js"\n  binaryTargets = ["native", "debian-openssl-3.0.x"]/' prisma/schema.prisma
RUN bunx prisma generate

RUN bun --bun run build

# copy production dependencies and source code into final image
FROM oven/bun:slim AS production
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

# Only `.output` folder is needed from the build stage
COPY --from=build /app/.output /app
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma

# run the app
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "--bun", "run", "/app/server/index.mjs" ]
