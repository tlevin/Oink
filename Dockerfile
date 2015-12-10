# Pull node
FROM node:4.2.1-onbuild

# expose port 3000
EXPOSE 3000

# Install dependencies from package.json
RUN npm install

# Run the server
