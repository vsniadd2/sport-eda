# Stage 1: build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: backend + static frontend
FROM node:20-alpine
WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev
COPY backend/ .
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
