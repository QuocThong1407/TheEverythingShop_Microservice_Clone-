# Development Dockerfile for Notification Service
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate

# Expose port
EXPOSE 3008

# Start development server with hot reload
CMD ["npm", "run", "dev"]
