#!/bin/sh

# Start Tor in the background
echo "Starting Tor..."
tor -f /etc/tor/torrc &

# Wait for Tor to start
sleep 10

# Start the Node.js application
echo "Starting Node.js application..."
exec node server.js