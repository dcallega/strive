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