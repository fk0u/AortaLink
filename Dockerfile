# ==============================================================================
# AortaLink — Open-Source ML-Powered EHR Platform (HL7 FHIR R4 Compliant)
# Full-stack single-container image: Express API + built SPA.
# ==============================================================================

# Build Stage — install deps and build the client bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime Stage — Node runs the Express API and serves the SPA + /api routes
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Production runtime needs: express, mongodb driver, auth libs, and the
# server entrypoint plus the built SPA.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 8080

CMD ["node", "server/index.js"]
