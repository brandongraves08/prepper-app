# syntax=docker/dockerfile:1
# Podman-compatible containerfile for Prepper App
FROM node:20-bookworm as builder

WORKDIR /app
COPY . .

# Install Node deps and build UI
RUN npm ci && npm run build --workspaces src/ui/frontend

# Install Python deps
RUN apt-get update && apt-get install -y python3 python3-pip && \
    pip3 install -r requirements.txt && \
    rm -rf /var/lib/apt/lists/*

# Final runtime image
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
EXPOSE 3000 8001
CMD ["node", "src/index.js"]
