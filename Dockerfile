# ---------- Stage 1: build the client ----------
FROM node:22-alpine AS client-build
WORKDIR /app/client

# Build-time env vars for Vite — Vite bakes these into the JS bundle
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy manifests first for better caching
COPY client/package.json client/package-lock.json ./
RUN npm ci

# Copy source and build
COPY client/ ./
RUN npm run build


# ---------- Stage 2: production server ----------
FROM node:22-alpine AS server

# Poppler for PDF → PNG conversion
RUN apk add --no-cache poppler-utils

WORKDIR /app/server

# Copy server manifests and install production deps only
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

# Copy the built client into where Express will look for it
# (matches server/src/index.js: ../../client/dist)
WORKDIR /app
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server

# Run as non-root
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

EXPOSE 8080
ENV NODE_ENV=production

CMD ["node", "src/index.js"]