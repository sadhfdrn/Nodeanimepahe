
const express = require('express');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

const animepaheRouter = require('./routes/animepahe');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/animepahe', animepaheRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to create SSH tunnel to localhost.run (generates .lhr.life URL)
function createLhrTunnel() {
  return new Promise((resolve, reject) => {
    console.log('Creating SSH tunnel to localhost.run...');
    
    // Create SSH tunnel to localhost.run which generates .lhr.life URLs
    const sshProcess = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'ConnectTimeout=10',
      '-R', `80:localhost:${port}`,
      'nokey@localhost.run'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let tunnelUrl = '';
    let urlFound = false;

    sshProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('SSH Output:', output);
      
      // Look for .lhr.life URL in output
      const urlMatch = output.match(/https?:\/\/[a-zA-Z0-9\-]+\.lhr\.life/);
      if (urlMatch && !urlFound) {
        tunnelUrl = urlMatch[0];
        urlFound = true;
        console.log(`Tunnel URL found: ${tunnelUrl}`);
        resolve({ url: tunnelUrl, process: sshProcess });
      }
    });

    sshProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('SSH Info:', output);
      
      // Sometimes the URL appears in stderr
      const urlMatch = output.match(/https?:\/\/[a-zA-Z0-9\-]+\.lhr\.life/);
      if (urlMatch && !urlFound) {
        tunnelUrl = urlMatch[0];
        urlFound = true;
        console.log(`Tunnel URL found: ${tunnelUrl}`);
        resolve({ url: tunnelUrl, process: sshProcess });
      }
    });

    sshProcess.on('close', (code) => {
      console.log(`SSH process closed with code ${code}`);
      if (!urlFound) {
        reject(new Error(`SSH process closed with code ${code} before URL was found`));
      }
    });

    sshProcess.on('error', (error) => {
      reject(new Error(`SSH process error: ${error.message}`));
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      if (!urlFound) {
        sshProcess.kill();
        reject(new Error('Timeout waiting for tunnel URL'));
      }
    }, 20000);
  });
}

(async () => {
  try {
    // Start the Express server first
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening at http://localhost:${port}`);
    });

    // Wait a moment for the server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create the SSH tunnel directly (skip bore completely)
    console.log('Creating SSH tunnel to generate .lhr.life URL...');
    const tunnel = await createLhrTunnel();

    console.log(`Your tunnel URL is: ${tunnel.url}`);
    console.log('No password required - Direct tunnel access!');

    // Store tunnel details for frontend
    fs.writeFileSync(path.join(__dirname, 'public', 'tunnel-details.json'), JSON.stringify({ 
      url: tunnel.url,
      provider: 'localhost.run',
      passwordRequired: false
    }));

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\nShutting down gracefully...');
      tunnel.process.kill();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      tunnel.process.kill();
      server.close(() => {
        process.exit(0);
      });
    });

    // Monitor tunnel process
    tunnel.process.on('close', () => {
      console.log('Tunnel closed');
      server.close(() => {
        process.exit();
      });
    });
    
  } catch (error) {
    console.error('Error creating tunnel:', error.message);
    console.log('Starting server without tunnel...');
    
    // Fallback: start server without tunnel
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening at http://localhost:${port}`);
      console.log('Tunnel creation failed - server running locally only');
    });
  }
})();