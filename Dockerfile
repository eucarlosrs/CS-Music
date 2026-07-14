# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Run the build script to compile the frontend and backend bundle
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the build artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# Expose default port (Cloud Run will override this with PORT env var)
EXPOSE 8080

# Command to start the application
CMD ["npm", "start"]
