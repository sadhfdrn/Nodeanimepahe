# Tor WebSocket Proxy Integration Guide

## Overview
This guide shows how to integrate the main AnimePahe API with the hosted Tor WebSocket proxy for anonymous scraping.

## Hosted Tor WebSocket Proxy
🔗 **Live Service:** https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/

### WebSocket Endpoint
- **URL:** `wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws`
- **Protocol:** WebSocket with JSON message format

## Integration Examples

### JavaScript WebSocket Client
```javascript
const ws = new WebSocket('wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws');

// Send AnimePahe request through Tor
function fetchAnimePaheData(url) {
  const request = {
    type: 'proxy-request',
    requestId: Date.now().toString(),
    url: url,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };
  
  ws.send(JSON.stringify(request));
}

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  if (response.type === 'proxy-response') {
    console.log('AnimePahe data:', response.data);
  }
};
```

### REST API Integration
```bash
# Proxy AnimePahe request through Tor
curl -X POST https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://animepahe.ru/api?m=search&q=naruto",
    "method": "GET",
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }'
```

### Node.js Integration Example
```javascript
const axios = require('axios');

async function fetchThroughTor(url) {
  try {
    const response = await axios.post('https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy', {
      url: url,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Tor proxy error:', error.message);
    throw error;
  }
}

// Usage
fetchThroughTor('https://animepahe.ru/api?m=search&q=onepiece')
  .then(data => console.log('Data:', data))
  .catch(err => console.error('Error:', err));
```

## Modifying AnimePahe API to Use Tor Proxy

### Option 1: WebSocket Integration
Add WebSocket client to the main AnimePahe API to route requests through your Tor proxy:

```javascript
// In lib/consumet/models/proxy.js
const WebSocket = require('ws');

class TorWebSocketProxy {
  constructor(torWebSocketUrl = 'wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws') {
    this.wsUrl = torWebSocketUrl;
    this.ws = null;
    this.pendingRequests = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.wsUrl);
    
    this.ws.on('message', (data) => {
      const response = JSON.parse(data);
      if (response.type === 'proxy-response' && this.pendingRequests.has(response.requestId)) {
        const { resolve } = this.pendingRequests.get(response.requestId);
        this.pendingRequests.delete(response.requestId);
        resolve(response);
      }
    });
  }

  async request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString() + Math.random();
      
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.ws.send(JSON.stringify({
        type: 'proxy-request',
        requestId,
        url,
        method: options.method || 'GET',
        headers: options.headers || {}
      }));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
}
```

### Option 2: REST API Integration
Modify the AnimePahe class to use the Tor REST API:

```javascript
// In lib/consumet/anime/animepahe.js
async function makeRequest(url, options = {}) {
  const torProxyResponse = await axios.post('https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy', {
    url: url,
    method: options.method || 'GET',
    headers: options.headers || {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  return {
    data: torProxyResponse.data.data,
    status: torProxyResponse.data.status
  };
}
```

## Benefits

1. **Complete Anonymity**: All AnimePahe requests routed through Tor network
2. **IP Rotation**: Automatic IP changes through Tor exit nodes  
3. **Bypass Restrictions**: Access content regardless of geographic blocks
4. **Scalability**: Hosted service handles multiple concurrent requests
5. **Real-time Monitoring**: WebSocket provides immediate connection status

## Testing Integration

1. Visit https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/
2. Test the "Send Request via Tor" feature with AnimePahe URLs
3. Monitor the console for successful responses
4. Check that external IP changes between requests

## Production Considerations

- Add error handling and retry logic
- Implement request queuing for high-volume usage  
- Monitor Tor connection health
- Add authentication if needed for private use
- Consider rate limiting to avoid detection

The hosted Tor WebSocket proxy provides a robust foundation for anonymous AnimePahe scraping while keeping the main API clean and maintainable.