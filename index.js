const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
require('dotenv').config();

const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

// Proxy config from .env
const PROXY_HOST = process.env.PROXY_HOST;
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY_USER = process.env.PROXY_USER;
const PROXY_PASS = process.env.PROXY_PASS;

let httpsAgent, httpAgent;

if (PROXY_HOST && PROXY_PORT && PROXY_USER && PROXY_PASS) {
  const PROXY_URL = `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`;
  // Set proxy agents globally
  httpsAgent = new HttpsProxyAgent(PROXY_URL);
  httpAgent = new HttpProxyAgent(PROXY_URL);
  https.globalAgent = httpsAgent;
  http.globalAgent = httpAgent;
  console.log(`Using proxy: ${PROXY_HOST}:${PROXY_PORT} with user: ${PROXY_USER}`);
} else {
  console.log('No proxy configuration found, using direct connection');
}

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

// Platform detection function
function detectPlatform(host, headers) {
  // Check for platform-specific headers and hostnames
  if (host.includes('koyeb.app')) return 'koyeb';
  if (host.includes('render.com')) return 'render';
  if (host.includes('railway.app')) return 'railway';
  if (host.includes('vercel.app')) return 'vercel';
  if (host.includes('herokuapp.com')) return 'heroku';
  if (host.includes('fly.dev')) return 'fly';
  if (host.includes('netlify.app')) return 'netlify';
  if (host.includes('glitch.me')) return 'glitch';
  if (host.includes('replit.dev')) return 'replit';
  if (host.includes('localhost') || host.includes('127.0.0.1')) return 'local';
  
  // Check headers for platform identification
  if (headers['x-vercel-id']) return 'vercel';
  if (headers['x-render-origin-server']) return 'render';
  if (headers['x-railway-public-domain']) return 'railway';
  if (headers['x-forwarded-for'] && headers['x-forwarded-proto']) return 'cloud';
  
  return 'unknown';
}

// Extract real URL from various cloud platforms
function extractRealUrl(req) {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 
                  req.headers['x-scheme'] || 
                  (req.connection.encrypted ? 'https' : 'http');
  
  // For platforms that might use custom domains
  let realHost = host;
  
  // Some platforms set the original host in different headers
  if (req.headers['x-forwarded-host']) {
    realHost = req.headers['x-forwarded-host'];
  } else if (req.headers['x-original-host']) {
    realHost = req.headers['x-original-host'];
  }
  
  return `${protocol}://${realHost}`;
}

const animepaheRouter = require('./routes/animepahe');
const app = express();
const port = process.env.PORT || 3005;

let deploymentInfo = null;

// Middleware to pass proxy info to routes
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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/animepahe', animepaheRouter);

// Root route - detects and stores deployment URL
app.get('/', (req, res) => {
  const realUrl = extractRealUrl(req);
  const platform = detectPlatform(req.headers.host, req.headers);
  
  deploymentInfo = {
    url: realUrl,
    platform: platform,
    host: req.headers.host,
    proxyEnabled: true,
    proxyHost: PROXY_HOST,
    headers: {
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString(),
    detectedAt: 'root-request'
  };

  // Save to both filenames for compatibility
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Save as deployment-info.json (new format)
  fs.writeFileSync(
    path.join(publicDir, 'deployment-info.json'), 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // Also save as tunnel-details.json for backward compatibility
  fs.writeFileSync(
    path.join(publicDir, 'tunnel-details.json'), 
    JSON.stringify({
      url: deploymentInfo.url,
      platform: deploymentInfo.platform,
      timestamp: deploymentInfo.timestamp
    }, null, 2)
  );

  console.log(`✅ Detected deployment URL: ${realUrl} (Platform: ${platform})`);
  console.log(`Headers:`, {
    host: req.headers.host,
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    'x-forwarded-host': req.headers['x-forwarded-host']
  });

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get deployment info
app.get('/api/deployment-info', (req, res) => {
  if (!deploymentInfo) {
    // If not set yet, try to detect from current request
    const realUrl = extractRealUrl(req);
    const platform = detectPlatform(req.headers.host, req.headers);
    
    deploymentInfo = {
      url: realUrl,
      platform: platform,
      host: req.headers.host,
      proxyEnabled: true,
      timestamp: new Date().toISOString(),
      detectedAt: 'api-request'
    };
  }
  
  res.json(deploymentInfo);
});

// Legacy endpoint for backward compatibility
app.get('/tunnel-details.json', (req, res) => {
  if (!deploymentInfo) {
    const realUrl = extractRealUrl(req);
    const platform = detectPlatform(req.headers.host, req.headers);
    
    deploymentInfo = {
      url: realUrl,
      platform: platform,
      proxyEnabled: true,
      timestamp: new Date().toISOString()
    };
  }
  
  res.json({
    url: deploymentInfo.url,
    platform: deploymentInfo.platform,
    timestamp: deploymentInfo.timestamp
  });
});

// Tor health check (replacing proxy status)
app.get('/api/proxy-status', async (req, res) => {
  try {
    const ip = await testProxy();
    res.json({
      status: 'connected',
      tor: `${PROXY_HOST}:${PROXY_PORT}`,
      externalIP: ip,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'error',
      tor: `${PROXY_HOST}:${PROXY_PORT}`,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Platform health check (for cloud platforms)
app.get('/health', (req, res) => {
  const realUrl = extractRealUrl(req);
  const platform = detectPlatform(req.headers.host, req.headers);
  
  res.json({ 
    status: 'healthy', 
    platform: platform,
    url: realUrl,
    timestamp: new Date().toISOString() 
  });
});

// Additional endpoint to force URL detection
app.get('/api/detect-url', (req, res) => {
  const realUrl = extractRealUrl(req);
  const platform = detectPlatform(req.headers.host, req.headers);
  
  const detectionInfo = {
    url: realUrl,
    platform: platform,
    host: req.headers.host,
    proxyEnabled: true,
    proxyHost: PROXY_HOST,
    detectionMethod: 'forced',
    headers: {
      'host': req.headers.host,
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'cf-connecting-ip': req.headers['cf-connecting-ip'], // Cloudflare
      'x-vercel-id': req.headers['x-vercel-id'], // Vercel
      'x-render-origin-server': req.headers['x-render-origin-server'], // Render
      'x-railway-public-domain': req.headers['x-railway-public-domain'] // Railway
    },
    timestamp: new Date().toISOString()
  };
  
  // Update global deployment info
  deploymentInfo = detectionInfo;
  
  // Save to files
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(publicDir, 'deployment-info.json'), 
    JSON.stringify(detectionInfo, null, 2)
  );
  
  console.log(`🔍 Force detected URL: ${realUrl} (Platform: ${platform})`);
  
  res.json(detectionInfo);
});

// Catch-all route for SPA support (optional)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // For any other route, serve the main page and update deployment info
  const realUrl = extractRealUrl(req);
  const platform = detectPlatform(req.headers.host, req.headers);
  
  if (!deploymentInfo) {
    deploymentInfo = {
      url: realUrl,
      platform: platform,
      proxyEnabled: true,
      timestamp: new Date().toISOString(),
      detectedAt: 'catch-all'
    };
    
    console.log(`📍 Catch-all detected URL: ${realUrl} (Platform: ${platform})`);
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let server;

// Startup function with better error handling
async function startServer() {
  try {
    console.log('🔧 Testing Tor connection...');
    await testProxy();
    console.log('✅ Tor connection successful');

    server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📍 Local access: http://localhost:${port}`);
      console.log('🌐 Platform will assign public URL automatically');
      console.log('🧅 Using Tor network for scraping');
      
      // Try to detect platform from environment variables
      const envPlatform = 
        process.env.KOYEB_APP_NAME ? 'koyeb' :
        process.env.RENDER_SERVICE_NAME ? 'render' :
        process.env.RAILWAY_PROJECT_NAME ? 'railway' :
        process.env.VERCEL_URL ? 'vercel' :
        process.env.HEROKU_APP_NAME ? 'heroku' :
        'unknown';
        
      if (envPlatform !== 'unknown') {
        console.log(`🎯 Detected platform from environment: ${envPlatform}`);
      }
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}...`);
        server.listen(port + 1);
      }
    });
    
  } catch (error) {
    console.error('❌ Startup error:', error.message);
    console.log('⚠️  Continuing without Tor...');
    
    // Start server without Tor if connection fails
    server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port} (without Tor)`);
    });
  }
}

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.log('⏰ Force closing server');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  console.error(error.stack);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();