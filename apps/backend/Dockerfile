# ── AQTMS Backend Dockerfile ──
FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY package.json tsconfig.base.json turbo.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/backend ./apps/backend

RUN pnpm install --frozen-lockfile
RUN cd apps/backend && npx prisma generate
RUN cd apps/backend && npx tsc --outDir dist 2>/dev/null || true

FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/.npmrc ./.npmrc

ENV NODE_ENV=production
EXPOSE 3001

# Startup: apply migrations then start server
CMD sh -c "cd /app && npx prisma db push --skip-generate 2>/dev/null || true && node dist/main.js"
