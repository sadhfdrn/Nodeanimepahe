const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

class Proxy {
  constructor(proxyConfig, adapter, torAgent) {
    this.proxyConfig = proxyConfig;
    this.adapter = adapter;
    this.torAgent = torAgent;
    this.validUrl = /^https?:\/\/.+/;
    
    // Create axios client with Tor agent if provided
    this.client = axios.create();
    
    // Use Tor agent for HTTPS requests if available
    if (torAgent) {
      this.client.defaults.httpsAgent = torAgent;
      this.client.defaults.httpAgent = torAgent;
    }

    if (proxyConfig) this.setProxy(proxyConfig);
    if (adapter) this.setAxiosAdapter(adapter);
  }

  setProxy(proxyConfig) {
    if (!proxyConfig?.url) return;

    if (typeof proxyConfig?.url === 'string')
      if (!this.validUrl.test(proxyConfig.url)) throw new Error('Proxy URL is invalid!');

    if (Array.isArray(proxyConfig?.url)) {
      for (const [i, url] of this.toMap(proxyConfig.url))
        if (!this.validUrl.test(url)) throw new Error(`Proxy URL at index ${i} is invalid!`);

      this.rotateProxy({ ...proxyConfig, urls: proxyConfig.url });

      return;
    }

    this.client.interceptors.request.use(config => {
      if (proxyConfig?.url) {
        config.headers['x-api-key'] = proxyConfig?.key ?? '';
        config.url = `${proxyConfig.url}${config?.url ? config?.url : ''}`;
      }
      if (config?.url?.includes('anify')) config.headers['User-Agent'] = 'consumet';
      return config;
    });
  }

  setAxiosAdapter(adapter) {
    this.client.defaults.adapter = adapter;
  }
  
  rotateProxy = (proxy) => {
    setInterval(() => {
      const url = proxy.urls.shift();
      if (url) proxy.urls.push(url);
      this.setProxy({ url: proxy.urls[0], key: proxy.key });
    }, proxy?.rotateInterval ?? 5000);
  };
  
  toMap = (arr) => arr.map((v, i) => [i, v]);
}

module.exports = Proxy;
