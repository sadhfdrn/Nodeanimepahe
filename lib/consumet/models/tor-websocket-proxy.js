const WebSocket = require('ws');
const axios = require('axios');

class TorWebSocketProxy {
  constructor(torWebSocketUrl = 'wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws') {
    this.wsUrl = torWebSocketUrl;
    this.restUrl = 'https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy';
    this.ws = null;
    this.pendingRequests = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 5000;
    
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        console.log('🔗 Connected to Tor WebSocket proxy');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });
      
      this.ws.on('message', (data) => {
        try {
          const response = JSON.parse(data);
          this.handleMessage(response);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('close', () => {
        console.log('❌ Tor WebSocket disconnected');
        this.isConnected = false;
        this.reconnect();
      });
      
      this.ws.on('error', (error) => {
        console.error('🚨 Tor WebSocket error:', error.message);
        this.isConnected = false;
      });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error.message);
      this.isConnected = false;
    }
  }

  handleMessage(response) {
    switch (response.type) {
      case 'connection':
        console.log(`🧅 Tor proxy connection established (ID: ${response.connectionId})`);
        break;
      case 'proxy-response':
        if (this.pendingRequests.has(response.requestId)) {
          const { resolve } = this.pendingRequests.get(response.requestId);
          this.pendingRequests.delete(response.requestId);
          resolve({
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        break;
      case 'proxy-error':
        if (this.pendingRequests.has(response.requestId)) {
          const { reject } = this.pendingRequests.get(response.requestId);
          this.pendingRequests.delete(response.requestId);
          reject(new Error(`Tor proxy error: ${response.error}`));
        }
        break;
      case 'tor-status':
        if (response.status === 'connected') {
          console.log(`🧅 Tor status: Connected (IP: ${response.externalIP})`);
        } else {
          console.log(`❌ Tor status: ${response.error}`);
        }
        break;
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect to Tor proxy (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.log('❌ Max reconnection attempts reached. Falling back to REST API.');
    }
  }

  async request(url, options = {}) {
    // Try WebSocket first if connected
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.requestViaWebSocket(url, options);
    }
    
    // Fallback to REST API
    return this.requestViaREST(url, options);
  }

  async requestViaWebSocket(url, options = {}) {
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString() + Math.random().toString(36).substring(7);
      
      this.pendingRequests.set(requestId, { resolve, reject });
      
      const request = {
        type: 'proxy-request',
        requestId: requestId,
        url: url,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...options.headers
        }
      };

      if (options.data && (options.method === 'POST' || options.method === 'PUT')) {
        request.body = options.data;
      }

      this.ws.send(JSON.stringify(request));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Tor WebSocket request timeout'));
        }
      }, 30000);
    });
  }

  async requestViaREST(url, options = {}) {
    try {
      const response = await axios.post(this.restUrl, {
        url: url,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...options.headers
        },
        data: options.data
      }, {
        timeout: 30000
      });

      return {
        data: response.data.data,
        status: response.data.status,
        statusText: response.data.statusText,
        headers: response.data.headers
      };
    } catch (error) {
      throw new Error(`Tor REST API error: ${error.message}`);
    }
  }

  async checkTorStatus() {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'tor-status' }));
    } else {
      try {
        const response = await axios.get('https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/tor-status');
        console.log(`🧅 Tor status: ${response.data.status} (IP: ${response.data.externalIP})`);
        return response.data;
      } catch (error) {
        console.error('Failed to check Tor status:', error.message);
        throw error;
      }
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
    this.pendingRequests.clear();
  }
}

module.exports = TorWebSocketProxy;