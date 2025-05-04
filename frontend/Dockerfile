FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 5173

# Set environment variables
ENV HOST=0.0.0.0

# Start the development server
CMD ["npm", "run", "dev"]
# Stage 1: install dependencies & build
FROM node:18-alpine AS build
WORKDIR /app

# Copy package manifests and install
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: serve with Nginx
FROM nginx:stable-alpine AS production
# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 and run Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]