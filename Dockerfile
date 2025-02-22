
# Use Node 20 LTS (Latest Stable Version)
FROM node:20-alpine3.19

# Set the working directory in the container
WORKDIR /app

# Copy both package.json AND package-lock.json
COPY package.json package-lock.json ./

# # Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (if needed)
RUN npm run build

# Expose the port the app runs on
EXPOSE 3011

# Command to run the application
CMD ["npm","run", "start"]