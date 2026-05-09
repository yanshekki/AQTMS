# 多階段建置，減小最終映像大小
FROM node:20-alpine AS builder

WORKDIR /app

# 先複製 package files 安裝依賴
COPY package*.json pnpm-lock.yaml* ./
COPY apps/backend/package*.json ./apps/backend/

RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 複製原始碼並建置
COPY . .
RUN pnpm --filter backend build

# 執行階段
FROM node:20-alpine

WORKDIR /app

# 只複製建置後的檔案
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./package.json

# Prisma Client（如果使用）
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
