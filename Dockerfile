FROM node:20-alpine

WORKDIR /app

# Copy application files and pre-installed dependencies
COPY package*.json ./
COPY node_modules/ ./node_modules/
COPY index.html ./
COPY play/ ./play/
COPY server.js ./

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
