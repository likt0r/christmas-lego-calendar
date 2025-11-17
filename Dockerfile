# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# Note: Nuxt's .output contains all necessary dependencies, so we don't need to install them again

# Copy built application from builder
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

# Create necessary directories with proper permissions
# These directories need to be writable by the nuxtjs user at runtime
RUN mkdir -p /app/files && \
    chown -R nuxtjs:nodejs /app/files && \
    chmod -R 755 /app/files 

# Copy necessary directories if they exist in source
# These are needed at runtime for the application
COPY --chown=nuxtjs:nodejs public ./public

# Set environment to production
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

# Switch to non-root user
USER nuxtjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]

