const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
require('dotenv').config();

// Proxy configuration
const PROXY_HOST = '104.222.161.211';
const PROXY_PORT = 6343;
const PROXY_USER = 'ccmvjidq';
const PROXY_PASS = 'kg7t8326hfjz';
const PROXY_URL = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;

// Set up global proxy agents
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

const httpsAgent = new HttpsProxyAgent(PROXY_URL);
const httpAgent = new HttpProxyAgent(PROXY_URL);

// Configure global agents for all HTTP/HTTPS requests
https.globalAgent = httpsAgent;
http.globalAgent = httpAgent;

console.log(`Using proxy: ${PROXY_HOST}:${PROXY_PORT} with user: ${PROXY_USER}`);

// Test proxy connection
async function testProxy() {
  try {
    const https = require('https');
    
    const options = {
      hostname: 'httpbin.org',
      path: '/ip',
      method: 'GET',
      agent: httpsAgent
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(`Proxy working! External IP: ${response.origin}`);
            resolve(response.origin);
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Proxy test timeout')));
      req.end();
    });
  } catch (error) {
    console.error('Proxy test failed:', error.message);
    throw error;
  }
}

const animepaheRouter = require('./routes/animepahe');

const app = express();
// Use PORT environment variable (Koyeb sets this) or fallback to 3005
const port = process.env.PORT || 3005;

// Middleware to add proxy info to requests
app.use((req, res, next) => {
  req.proxyInfo = {
    host: PROXY_HOST,
    port: PROXY_PORT,
    user: PROXY_USER,
    httpsAgent: httpsAgent,
    httpAgent: httpAgent
  };
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/animepahe', animepaheRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add endpoint to check proxy status
app.get('/api/proxy-status', async (req, res) => {
  try {
    const ip = await testProxy();
    res.json({ 
      status: 'connected', 
      proxy: `${PROXY_HOST}:${PROXY_PORT}`,
      externalIP: ip 
    });
  } catch (error) {
    res.json({ 
      status: 'error', 
      proxy: `${PROXY_HOST}:${PROXY_PORT}`,
      error: error.message 
    });
  }
});

// Health check endpoint for Koyeb
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

let server;

(async () => {
  try {
    // Test proxy connection first
    console.log('Testing proxy connection...');
    await testProxy();
    
    // Start the Express server - Koyeb will handle public URL exposure
    server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on port ${port}`);
      console.log('All outgoing requests will use the configured proxy');
      console.log('Koyeb will provide the public URL for this service');
    });

    // Create deployment info file for frontend
    const deploymentInfo = {
      port: port,
      proxyEnabled: true,
      proxyHost: PROXY_HOST,
      platform: 'koyeb',
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(path.join(__dirname, 'public', 'deployment-info.json'), 
      JSON.stringify(deploymentInfo, null, 2));

    console.log('Deployment info saved for frontend');
    
  } catch (error) {
    console.error('Error during startup:', error.message);
    process.exit(1);
  }
})();

// Handle process termination
function gracefulShutdown() {
  console.log('\nShutting down gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejections in production, just log them
});