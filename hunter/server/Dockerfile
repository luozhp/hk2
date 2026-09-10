# ---------- 构建阶段 ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- 运行阶段 ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# node:sqlite 在 Node 22 需要实验性开关（22.13+ 可移除）
ENV NODE_OPTIONS=--experimental-sqlite
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY .env.example ./
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "dist/main.js"]
