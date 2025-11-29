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
RUN bunx prisma generate

RUN bun --bun run build

# copy production dependencies and source code into final image
FROM oven/bun:slim AS production
WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Copy necessary files from build stage
COPY --from=build /app/.output /app
COPY --from=build /app/prisma /app/prisma
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma

# Create startup script that runs migrations then starts the server
RUN echo '#!/bin/sh\n\
echo "Running database migrations..."\n\
cd /app && bunx prisma migrate deploy\n\
echo "Starting server..."\n\
exec bun --bun run /app/server/index.mjs' > /app/start.sh && chmod +x /app/start.sh

# run the app
EXPOSE 3000/tcp
ENTRYPOINT [ "/app/start.sh" ]
