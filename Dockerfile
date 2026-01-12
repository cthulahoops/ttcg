# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Build the client
RUN bun run build && bunx vite build

# Expose the port
EXPOSE 5000

# Set PORT environment variable
ENV PORT=5000

# Start the server
CMD ["bun", "run", "server/server.ts"]
