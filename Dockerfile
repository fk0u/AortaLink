# ==============================================================================
# AortaLink — Open-Source AI EHR Platform (HL7 FHIR R4 Compliant)
# Production Multi-Stage Dockerfile
# ==============================================================================

# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build application
COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine AS runner

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Custom Nginx SPA configuration for TanStack Router
RUN echo $'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    error_page 500 502 503 504 /50x.html;\n\
    location = /50x.html {\n\
        root /usr/share/nginx/html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
