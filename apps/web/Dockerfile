# ── AQTMS Frontend Dockerfile ──
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY package.json tsconfig.base.json turbo.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aqtms/web build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
