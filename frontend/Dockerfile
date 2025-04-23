FROM node:16-alpine

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose the port Vite runs on
EXPOSE 5173

# Set environment variables
ENV HOST=0.0.0.0

# Start the app
CMD ["npm", "run", "dev", "--", "--host"]