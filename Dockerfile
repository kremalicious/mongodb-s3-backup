FROM node:22-alpine AS base

# This includes mongodump. 
# This alpine package is outdated but works fine for now
RUN apk add --no-cache mongodb-tools

# 1. Dependencies stage
FROM base AS deps
WORKDIR /backup
COPY package.json package-lock.json ./

RUN npm ci

# 2. Builder stage
FROM base AS builder
WORKDIR /backup
COPY --from=deps /backup/node_modules ./node_modules
COPY package.json tsconfig.json biome.json ./
COPY src ./src

RUN npm run build && \
    npm prune --omit=dev

# 3. Runner stage
FROM base AS runner
WORKDIR /backup
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 backupuser && \
    adduser --system --uid 1001 backupuser

COPY --from=builder --chown=backupuser:backupuser /backup/dist ./dist
COPY --from=builder --chown=backupuser:backupuser /backup/node_modules ./node_modules
COPY --from=builder --chown=backupuser:backupuser /backup/package.json ./package.json

USER backupuser

CMD ["npm", "run", "start"]
