# AnimePahe API Server

## Overview

This is a dual-application setup: a web scraping API server that provides programmatic access to AnimePahe content, plus a separate full-stack Tor WebSocket proxy application. The main application serves as a middleware layer that scrapes anime information from AnimePahe.ru with proxy support, while the dedicated Tor application provides anonymous request routing through WebSocket connections. Both applications work independently and can be deployed separately.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
The application follows a modular Express.js architecture with clear separation of concerns:

**Core Server Structure:**
- Express.js server with routing middleware
- Modular route handlers in `/routes` directory
- Custom scraping library organized in `/lib/consumet` with OOP design patterns
- Environment-based configuration using dotenv

**Scraping Architecture:**
The scraping functionality is built using a class-based inheritance model:
- `BaseProvider` → `BaseParser` → `AnimeParser` → `AnimePahe`
- Each class adds specific functionality while maintaining consistent interfaces
- Cheerio for HTML parsing and data extraction
- Axios for HTTP requests with proxy support

**API Design:**
RESTful endpoints following predictable patterns:
- `/search/:query` - Search anime by title
- `/info/:animeId` - Get detailed anime information
- `/sources/:episodeId/:episodeSession` - Get streaming sources for episodes

### Frontend Architecture
Minimal static frontend approach:
- Single HTML page served from `/public` directory
- Tailwind CSS for styling with dark theme
- No client-side JavaScript framework - pure HTML/CSS documentation interface
- Responsive design for mobile and desktop

### Proxy Integration
Comprehensive proxy support for web scraping:
- HTTP and HTTPS proxy agents configured globally when credentials available
- Authentication support with username/password
- Proxy connection testing on startup
- Environment variable configuration for easy deployment
- Fallback to direct connection when proxy unavailable

### Error Handling
Consistent error handling across all endpoints:
- Try-catch blocks with meaningful error messages
- HTTP status codes (500 for server errors)
- JSON error responses for API consistency

### Deployment Configuration
Optimized for serverless deployment:
- Vercel configuration with Node.js runtime
- API route mapping for proper request handling
- Environment variable support for sensitive configuration

## External Dependencies

### Core Web Framework
- **Express.js** - Web server framework for routing and middleware
- **dotenv** - Environment variable management

### Web Scraping Stack
- **Axios** - HTTP client for making requests to target websites
- **Cheerio** - Server-side HTML parsing and DOM manipulation
- **socks-proxy-agent** - SOCKS5 proxy support for Tor network integration

### Target Website
- **AnimePahe.ru** - Primary data source for anime information and streaming links
- **httpbin.org** - Used for proxy connection testing

## Tor WebSocket Proxy (Separate Application)

A dedicated full-stack Tor proxy application located in the `/Tor` directory provides:

### Architecture
- **Docker-based deployment** with complete Tor network setup
- **WebSocket API** for real-time proxy request routing
- **REST API** for traditional HTTP proxy requests
- **Interactive web interface** for testing and monitoring

### Key Features
- Complete Tor network integration with SOCKS5 proxy
- Real-time WebSocket communication for proxy requests
- Docker containerization with multi-service orchestration
- Web-based dashboard for connection monitoring and testing
- Automatic Tor bootstrapping and health checking

### Deployment
- `docker-compose up --build` for complete setup
- Includes Tor daemon, Node.js server, and web interface
- **Live deployment:** https://homeless-cosette-kayceeko-3490cd6d.koyeb.app/
- Local development: http://localhost:3000 with WebSocket endpoint at /ws

### Deployment Platform
- **Vercel** - Serverless deployment platform with Node.js runtime support

### Styling Framework
- **Tailwind CSS** - Utility-first CSS framework delivered via CDN for the documentation interface