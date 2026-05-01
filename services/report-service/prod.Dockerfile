# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app

# Copy shared library and service
COPY ../../shared /app/shared
COPY . /app/report-service

WORKDIR /app/report-service

# Install dependencies
RUN npm ci

# Build TypeScript
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3007

# Copy shared library and built application
COPY --from=builder /app/shared /app/shared
COPY --from=builder /app/report-service/package*.json ./
COPY --from=builder /app/report-service/dist ./dist
COPY --from=builder /app/report-service/prisma ./prisma

# Install production dependencies only
RUN npm ci --omit=dev

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3007

CMD ["npm", "start"]
