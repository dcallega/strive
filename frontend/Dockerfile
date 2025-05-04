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

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports for HTTP and HTTPS
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]