const Proxy = require('./proxy');

class VideoExtractor extends Proxy {
  serverName = 'Unknown';
  sources = [];

  extract(videoUrl, ...args) {
    throw new Error("Method 'extract' must be implemented.");
  }
}

module.exports = VideoExtractor;
