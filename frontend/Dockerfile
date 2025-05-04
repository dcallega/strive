# Stage 1: install dependencies & build
FROM node:20-alpine AS build
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

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 and run Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]