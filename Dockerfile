FROM oven/bun:1.3-alpine AS base

# This includes mongodump. 
# This alpine package is outdated but works fine for now
RUN apk add --no-cache mongodb-tools

# 1. Dependencies stage
FROM base AS deps
WORKDIR /backup
COPY package.json bun.lock ./

RUN bun ci

# 2. Runner stage
FROM base AS runner
WORKDIR /backup
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 backupuser && \
    adduser --system --uid 1001 backupuser

COPY --from=deps --chown=backupuser:backupuser /backup/node_modules ./node_modules
COPY --chown=backupuser:backupuser package.json ./
COPY --chown=backupuser:backupuser src ./src

USER backupuser

CMD ["bun", "run", "start"]
