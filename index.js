const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
require('dotenv').config();

const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

// Proxy config
const PROXY_HOST = '104.222.161.211';
const PROXY_PORT = 6343;
const PROXY_USER = 'ccmvjidq';
const PROXY_PASS = 'kg7t8326hfjz';
const PROXY_URL = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;

// Set proxy agents globally
const httpsAgent = new HttpsProxyAgent(PROXY_URL);
const httpAgent = new HttpProxyAgent(PROXY_URL);
https.globalAgent = httpsAgent;
http.globalAgent = httpAgent;

console.log(`Using proxy: ${PROXY_HOST}:${PROXY_PORT} with user: ${PROXY_USER}`);

// Test proxy connection
async function testProxy() {
  try {
    const options = {
      hostname: 'httpbin.org',
      path: '/ip',
      method: 'GET',
      agent: httpsAgent
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
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
const port = process.env.PORT || 3005;

app.use((req, res, next) => {
  req.proxyInfo = {
    host: PROXY_HOST,
    port: PROXY_PORT,
    user: PROXY_USER,
    httpsAgent,
    httpAgent
  };
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/animepahe', animepaheRouter);

// ⬇️ Modified root route to detect and store real Koyeb URL
app.get('/', (req, res) => {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;

  const deploymentInfo = {
    url: fullUrl,
    proxyEnabled: true,
    proxyHost: PROXY_HOST,
    platform: 'koyeb',
    timestamp: new Date().toISOString()
  };

  const filePath = path.join(__dirname, 'public', 'deployment-info.json');
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Saved deployment URL: ${fullUrl}`);

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional: dynamic route to fetch deployment info
app.get('/api/deployment-info', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'deployment-info.json');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Deployment info not found' });
  }
});

// Proxy health check
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

// Koyeb health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

let server;

(async () => {
  try {
    console.log('Testing proxy connection...');
    await testProxy();

    server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on port ${port}`);
      console.log('Koyeb will expose the app at your public domain');
    });
  } catch (error) {
    console.error('Error during startup:', error.message);
    process.exit(1);
  }
})();

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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});