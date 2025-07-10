# Prepper App Dockerfile
FROM node:20-alpine
# Install openssl for Prisma (needed for sqlite on alpine)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package definitions first for better caching
COPY package*.json ./
RUN npm install

# Copy rest of code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Ensure database directory exists (will be volume-mounted in compose)
RUN mkdir -p prisma/database

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
