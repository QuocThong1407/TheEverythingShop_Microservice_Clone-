FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=development
ENV PORT=3007

# Copy shared library
COPY ../../shared /app/shared
COPY . /app

WORKDIR /app

# Install dependencies
RUN npm ci

EXPOSE 3007

CMD ["npm", "run", "dev"]
