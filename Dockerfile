# Use official Node.js image as base
FROM node:22.17.0-alpine3.21

# Configure timezone
RUN apk add --no-cache tzdata && \
	cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
	echo Asia/Shanghai > /etc/timezone && \
	apk del tzdata

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build production bundle
RUN npm run build

# Expose application port (adjust according to actual config)
EXPOSE 8000

# Start application. .env is not loaded inside container; env vars must be provided at runtime.
CMD ["npm", "start"]