# Tor WebSocket Proxy

A full-stack application that provides anonymous HTTP request routing through the Tor network via WebSocket connections. Built with Docker for easy deployment and scalability.

## Features

- **Tor Network Integration**: All requests routed through Tor SOCKS proxy for anonymity
- **WebSocket API**: Real-time bidirectional communication for proxy requests
- **REST API**: Traditional HTTP endpoints for proxy functionality
- **Docker Support**: Complete containerization with multi-service orchestration
- **Web Interface**: Interactive dashboard for testing and monitoring
- **Connection Management**: Automatic reconnection and health monitoring

## Quick Start with Docker

### Using Docker Compose (Recommended)

```bash
# Clone and navigate to the Tor directory
cd Tor

# Build and start the service
docker-compose up --build

# Access the application
open http://localhost:3000
```

### Using Docker directly

```bash
# Build the image
docker build -t tor-proxy-app .

# Run the container
docker run -p 3000:3000 -p 9050:9050 tor-proxy-app
```

## Local Development

### Prerequisites

- Node.js 18+
- Tor (installed and configured)

### Installation

```bash
# Install dependencies
npm install

# Start Tor service (Linux/macOS)
tor -f torrc

# Start the application
npm run dev
```

## API Documentation

### WebSocket API

Connect to: `ws://localhost:3000/ws`

#### Message Types

**Proxy Request**
```json
{
  "type": "proxy-request",
  "requestId": "unique-id",
  "url": "https://httpbin.org/ip",
  "method": "GET",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {"key": "value"}
}
```

**Tor Status Check**
```json
{
  "type": "tor-status"
}
```

**Ping/Keep-Alive**
```json
{
  "type": "ping"
}
```

### REST API Endpoints

- `GET /api/tor-status` - Check Tor connection status
- `POST /api/proxy` - Proxy HTTP request through Tor
- `GET /api/stats` - Server and connection statistics
- `GET /health` - Service health check

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Client    │◄──►│  Node.js Server  │◄──►│   Tor Network   │
│                 │    │                  │    │                 │
│ - WebSocket     │    │ - Express.js     │    │ - SOCKS5 Proxy  │
│ - REST Client   │    │ - WebSocket      │    │ - Anonymization │
│ - Web UI        │    │ - Tor Integration│    │ - Exit Nodes    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

- `TOR_HOST` - Tor SOCKS proxy host (default: 127.0.0.1)
- `TOR_PORT` - Tor SOCKS proxy port (default: 9050)
- `PORT` - Application port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

### Tor Configuration

The `torrc` file configures Tor with:
- SOCKS proxy on port 9050
- Open policy for all connections
- Logging to stdout for Docker

## Docker Architecture

### Services

- **tor-proxy-app**: Main application container with Tor and Node.js
- **tor_data**: Persistent volume for Tor data directory

### Networking

- Port 3000: Web application and API
- Port 9050: Tor SOCKS proxy (internal)

## Security Considerations

- All HTTP requests are routed through Tor network
- WebSocket connections provide real-time communication
- No request logging or data persistence by default
- Docker isolation provides additional security layer

## Usage Examples

### WebSocket Client (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Send proxy request
  ws.send(JSON.stringify({
    type: 'proxy-request',
    requestId: '123',
    url: 'https://api.example.com/data',
    method: 'GET'
  }));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('Response:', response);
};
```

### REST API Client (curl)

```bash
# Check Tor status
curl http://localhost:3000/api/tor-status

# Proxy a request
curl -X POST http://localhost:3000/api/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://httpbin.org/ip",
    "method": "GET"
  }'
```

## Monitoring and Debugging

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Tor connectivity
curl http://localhost:3000/api/tor-status

# Connection statistics
curl http://localhost:3000/api/stats
```

### Logs

```bash
# View container logs
docker logs <container-id>

# Follow logs in real-time
docker logs -f <container-id>
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This software is provided for educational and research purposes. Users are responsible for ensuring compliance with local laws and regulations regarding privacy tools and anonymization software.