const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Tor configuration
const TOR_HOST = process.env.TOR_HOST || '127.0.0.1';
const TOR_PORT = process.env.TOR_PORT || 9050;
const PORT = process.env.PORT || 3000;

// Create Tor SOCKS proxy agent
const torAgent = new SocksProxyAgent(`socks5://${TOR_HOST}:${TOR_PORT}`);

// Configure axios with Tor proxy
const torAxios = axios.create({
  httpsAgent: torAgent,
  httpAgent: torAgent,
  timeout: 30000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket server for proxy routing
const wss = new WebSocket.Server({ 
  server: server, 
  path: '/ws' 
});

// Store active connections
const connections = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const connectionId = Math.random().toString(36).substring(7);
  connections.set(connectionId, ws);
  
  console.log(`WebSocket client connected: ${connectionId}`);
  
  ws.send(JSON.stringify({
    type: 'connection',
    connectionId: connectionId,
    message: 'Connected to Tor WebSocket Proxy'
  }));

  // Handle incoming messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'proxy-request':
          await handleProxyRequest(ws, data);
          break;
        case 'tor-status':
          await handleTorStatus(ws);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid JSON message' 
      }));
    }
  });

  ws.on('close', () => {
    connections.delete(connectionId);
    console.log(`WebSocket client disconnected: ${connectionId}`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    connections.delete(connectionId);
  });
});

// Handle proxy requests through WebSocket
async function handleProxyRequest(ws, data) {
  try {
    const { url, method = 'GET', headers = {}, body } = data;
    
    const response = await torAxios({
      url: url,
      method: method,
      headers: headers,
      data: body,
      validateStatus: () => true // Accept all status codes
    });

    ws.send(JSON.stringify({
      type: 'proxy-response',
      requestId: data.requestId,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'proxy-error',
      requestId: data.requestId,
      error: error.message,
      code: error.code
    }));
  }
}

// Handle Tor status check
async function handleTorStatus(ws) {
  try {
    const response = await torAxios.get('https://httpbin.org/ip');
    
    ws.send(JSON.stringify({
      type: 'tor-status',
      status: 'connected',
      externalIP: response.data.origin,
      torHost: TOR_HOST,
      torPort: TOR_PORT,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'tor-status',
      status: 'error',
      error: error.message,
      torHost: TOR_HOST,
      torPort: TOR_PORT,
      timestamp: new Date().toISOString()
    }));
  }
}

// REST API endpoints

// Test Tor connection
app.get('/api/tor-status', async (req, res) => {
  try {
    const response = await torAxios.get('https://httpbin.org/ip');
    
    res.json({
      status: 'connected',
      externalIP: response.data.origin,
      torHost: TOR_HOST,
      torPort: TOR_PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      torHost: TOR_HOST,
      torPort: TOR_PORT,
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy endpoint for REST requests
app.post('/api/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, data } = req.body;
    
    const response = await torAxios({
      url: url,
      method: method,
      headers: headers,
      data: data,
      validateStatus: () => true
    });

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      code: error.code
    });
  }
});

// Get connection stats
app.get('/api/stats', (req, res) => {
  res.json({
    activeConnections: connections.size,
    torHost: TOR_HOST,
    torPort: TOR_PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'tor-websocket-proxy',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Tor WebSocket Proxy Server running on port ${PORT}`);
  console.log(`🧅 Tor SOCKS proxy: ${TOR_HOST}:${TOR_PORT}`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`📡 REST API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };