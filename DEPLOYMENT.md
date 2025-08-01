# Deployment Configuration Guide

## Environment Variables

### Required Environment Variables for Tor Integration

Add these environment variables to your deployment platform:

```env
TOR_WEBSOCKET_URL=wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws
TOR_REST_URL=https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy
```

### Optional Proxy Settings (Legacy)
```env
PROXY_HOST=your-proxy-host
PROXY_PORT=your-proxy-port
PROXY_USER=your-proxy-username
PROXY_PASS=your-proxy-password
```

## Vercel Deployment

### Configuration
The `vercel.json` is configured with:
- Node.js runtime with 30-second timeout
- API routes mapping to main application
- Catch-all route for frontend serving
- Production environment variables

### Deployment Steps
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `TOR_WEBSOCKET_URL=wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws`
   - `TOR_REST_URL=https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy`
3. Deploy automatically via Git push

### Vercel Environment Variables Setup
```bash
# Using Vercel CLI
vercel env add TOR_WEBSOCKET_URL production
# Enter: wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws

vercel env add TOR_REST_URL production  
# Enter: https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy
```

## Netlify Deployment

### Configuration
The `netlify.toml` is configured with:
- Function timeout of 30 seconds
- Serverless function handling via `/functions/server.js`
- Redirect rules for API and frontend routes
- Build environment settings

### Deployment Steps
1. Connect repository to Netlify
2. Build settings are auto-configured via `netlify.toml`
3. Add environment variables in Netlify dashboard:
   - `TOR_WEBSOCKET_URL=wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws`
   - `TOR_REST_URL=https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy`
4. Deploy via Git push

### Netlify Environment Variables Setup
1. Go to Site Settings → Environment Variables
2. Add:
   - Key: `TOR_WEBSOCKET_URL`, Value: `wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws`
   - Key: `TOR_REST_URL`, Value: `https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy`

## Local Development

For local development, you can set environment variables in your shell:

```bash
export TOR_WEBSOCKET_URL=wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws
export TOR_REST_URL=https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy
npm start
```

Or create a `.env.local` file (not committed to git):
```env
TOR_WEBSOCKET_URL=wss://homeless-cosette-kayceeko-3490cd6d.koyeb.app/ws
TOR_REST_URL=https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/api/proxy
```

## Testing Deployment

After deployment, test the integration:

```bash
# Test search endpoint
curl https://your-domain.com/api/animepahe/search/naruto

# Test info endpoint  
curl https://your-domain.com/api/animepahe/info/anime-id

# Check deployment info
curl https://your-domain.com/api/deployment-info
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Fallback to REST API is automatic
   - Check environment variables are set correctly
   - Verify Tor service is accessible

2. **Timeout Errors**
   - Increase function timeout in platform settings
   - Tor requests may take longer than normal HTTP

3. **Environment Variables Not Working**
   - Ensure variables are set in deployment platform dashboard
   - Redeploy after adding environment variables
   - Check variable names match exactly

### Debug Endpoints

- `/api/deployment-info` - Shows deployment configuration
- `/api/proxy-status` - Tests connectivity (fallback when no proxy configured)
- `/health` - Basic health check

## Security Notes

- Environment variables are securely stored by deployment platforms
- Never commit sensitive URLs or credentials to version control
- The Tor WebSocket proxy provides additional anonymity layer
- All AnimePahe requests are routed through Tor network for privacy