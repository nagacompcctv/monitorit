# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with retry and stable registry
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies for drizzle-kit)
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Copy built application from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./server.ts
COPY --from=build /app/server ./server
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

# Expose port 3001
EXPOSE 3001

# Start the server
CMD ["npm", "run", "start"]
