FROM node:18-alpine

# Install Tor
RUN apk add --no-cache tor

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create Tor configuration directory
RUN mkdir -p /var/lib/tor

# Copy Tor configuration
COPY torrc /etc/tor/torrc

# Expose ports
EXPOSE 3000 9050

# Start script that runs both Tor and the app
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]