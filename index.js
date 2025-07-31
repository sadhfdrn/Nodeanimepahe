const express = require('express');
const path = require('path');
const localtunnel = require('localtunnel');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');

const animepaheRouter = require('./routes/animepahe');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/animepahe', animepaheRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to get current IP address
async function getCurrentIP() {
  return new Promise((resolve, reject) => {
    const request = https.get('https://api.ipify.org', (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data.trim());
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

(async () => {
  try {
    // Get current IP address
    const currentIP = await getCurrentIP();
    console.log(`Current IP address: ${currentIP}`);
    
    const tunnel = await localtunnel({ port: port, local_host: '0.0.0.0' });

    console.log(`Your tunnel URL is: ${tunnel.url}`);

    // Use current IP address as password
    const password = currentIP;
    console.log(`Your tunnel password is: ${password}`);

    // Storing for the frontend to fetch if needed
    fs.writeFileSync(path.join(__dirname, 'public', 'tunnel-details.json'), JSON.stringify({ 
      url: tunnel.url, 
      password: password,
      ip: currentIP 
    }));
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening at http://localhost:${port}`);
    });

    tunnel.on('close', () => {
      console.log('Tunnel closed');
      process.exit();
    });
    
  } catch (error) {
    console.error('Error getting IP address:', error.message);
    
    // Fallback: start server without IP-based password
    const tunnel = await localtunnel({ port: port, local_host: '0.0.0.0' });
    console.log(`Your tunnel URL is: ${tunnel.url}`);
    
    const password = "ip-fetch-failed";
    console.log(`Your tunnel password is: ${password} (IP fetch failed)`);
    
    fs.writeFileSync(path.join(__dirname, 'public', 'tunnel-details.json'), JSON.stringify({ 
      url: tunnel.url, 
      password: password 
    }));
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening at http://localhost:${port}`);
    });

    tunnel.on('close', () => {
      console.log('Tunnel closed');
      process.exit();
    });
  }
})();
