const { SocksProxyAgent } = require('socks-proxy-agent');
const https = require('https');
require('dotenv').config();

// Tor SOCKS5 proxy configuration
const TOR_HOST = process.env.TOR_HOST || '127.0.0.1';
const TOR_PORT = process.env.TOR_PORT || 9050;

// Create Tor proxy agent
const torAgent = new SocksProxyAgent(`socks5://${TOR_HOST}:${TOR_PORT}`);

// Test Tor connection
async function testTorConnection() {
  try {
    const options = {
      hostname: 'httpbin.org',
      path: '/ip',
      method: 'GET',
      agent: torAgent
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log(`Tor working! External IP: ${response.origin}`);
            resolve(response.origin);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Tor connection timeout')));
      req.end();
    });
  } catch (error) {
    console.error('Tor connection test failed:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('hello world');
  
  try {
    console.log(`Testing Tor connection via ${TOR_HOST}:${TOR_PORT}...`);
    await testTorConnection();
    console.log('Tor connection successful!');
  } catch (error) {
    console.log('Tor connection failed:', error.message);
    console.log('Make sure Tor is running on port 9050');
  }
}

main();