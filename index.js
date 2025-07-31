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

// Function to check if bore is installed
function checkBoreInstalled() {
  return new Promise((resolve) => {
    exec('which bore', (error) => {
      resolve(!error);
    });
  });
}

// Function to download and install bore
function installBore() {
  return new Promise((resolve, reject) => {
    console.log('Bore not found. Installing bore...');
    
    // Detect platform
    const platform = process.platform;
    let boreUrl;
    let fileName;
    
    if (platform === 'linux') {
      boreUrl = 'https://github.com/ekzhang/bore/releases/latest/download/bore-linux';
      fileName = 'bore';
    } else if (platform === 'darwin') {
      boreUrl = 'https://github.com/ekzhang/bore/releases/latest/download/bore-macos';
      fileName = 'bore';
    } else if (platform === 'win32') {
      boreUrl = 'https://github.com/ekzhang/bore/releases/latest/download/bore-win.exe';
      fileName = 'bore.exe';
    } else {
      reject(new Error(`Unsupported platform: ${platform}`));
      return;
    }
    
    const borePath = path.join(__dirname, fileName);
    const file = fs.createWriteStream(borePath);
    
    console.log(`Downloading bore from ${boreUrl}...`);
    
    https.get(boreUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download bore: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        
        // Make executable on Unix systems
        if (platform !== 'win32') {
          exec(`chmod +x ${borePath}`, (chmodError) => {
            if (chmodError) {
              reject(new Error(`Failed to make bore executable: ${chmodError.message}`));
              return;
            }
            
            console.log('Bore installed successfully!');
            resolve(borePath);
          });
        } else {
          console.log('Bore installed successfully!');
          resolve(borePath);
        }
      });
      
      file.on('error', (err) => {
        fs.unlink(borePath, () => {}); // Delete the file on error
        reject(new Error(`Failed to write bore file: ${err.message}`));
      });
    }).on('error', (err) => {
      reject(new Error(`Failed to download bore: ${err.message}`));
    });
  });
}

// Function to create tunnel using bore
function createBoreTunnel(borePath = 'bore') {
  return new Promise((resolve, reject) => {
    console.log('Creating bore tunnel...');
    
    // Spawn bore process
    const boreProcess = spawn(borePath, [
      'local',
      port.toString(),
      '--to',
      'bore.pub'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let tunnelUrl = '';
    let urlFound = false;

    // Listen for output to get the tunnel URL
    boreProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Bore Output:', output);
      
      // Look for the tunnel URL in the output
      const urlMatch = output.match(/listening at (https?:\/\/[^\s]+)/);
      if (urlMatch && !urlFound) {
        tunnelUrl = urlMatch[1];
        urlFound = true;
        console.log(`Tunnel URL found: ${tunnelUrl}`);
        resolve({ url: tunnelUrl, process: boreProcess });
      }
    });

    boreProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('Bore Info:', output);
      
      // Sometimes the URL appears in stderr
      const urlMatch = output.match(/listening at (https?:\/\/[^\s]+)/);
      if (urlMatch && !urlFound) {
        tunnelUrl = urlMatch[1];
        urlFound = true;
        console.log(`Tunnel URL found: ${tunnelUrl}`);
        resolve({ url: tunnelUrl, process: boreProcess });
      }
    });

    boreProcess.on('close', (code) => {
      console.log(`Bore process closed with code ${code}`);
      if (!urlFound) {
        reject(new Error(`Bore process closed with code ${code} before URL was found`));
      }
    });

    boreProcess.on('error', (error) => {
      reject(new Error(`Bore process error: ${error.message}`));
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!urlFound) {
        boreProcess.kill();
        reject(new Error('Timeout waiting for tunnel URL'));
      }
    }, 30000);
  });
}

// Fallback: Simple HTTP tunnel using ngrok-like approach
function createSimpleTunnel() {
  return new Promise((resolve, reject) => {
    console.log('Creating simple tunnel using ssh to localhost.run...');
    
    // Try a different approach - direct SSH to localhost.run without custom domain first
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
        reject(new Error(`SSH process closed with code ${code}`));
      }
    });

    sshProcess.on('error', (error) => {
      reject(new Error(`SSH process error: ${error.message}`));
    });

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

    // Create the tunnel - automatically install bore if needed
    let tunnel;
    
    try {
      // Check if bore is installed
      const boreInstalled = await checkBoreInstalled();
      let borePath = 'bore';
      
      if (!boreInstalled) {
        console.log('Bore not found in PATH, attempting to install...');
        borePath = await installBore();
      }
      
      // Try bore tunnel
      console.log('Creating bore tunnel...');
      tunnel = await createBoreTunnel(borePath);
      
    } catch (boreError) {
      console.log('Bore setup/usage failed:', boreError.message);
      console.log('Trying fallback SSH tunnel...');
      
      try {
        // Fallback to simple SSH tunnel
        tunnel = await createSimpleTunnel();
      } catch (sshError) {
        console.log('SSH tunnel also failed:', sshError.message);
        throw new Error('All tunnel methods failed');
      }
    }

    console.log(`Your tunnel URL is: ${tunnel.url}`);
    console.log('No password required - Direct tunnel access!');

    // Store tunnel details for frontend
    fs.writeFileSync(path.join(__dirname, 'public', 'tunnel-details.json'), JSON.stringify({ 
      url: tunnel.url,
      provider: 'tunnel',
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
