const BaseParser = require('./base-parser');

class AnimeParser extends BaseParser {
  isDubAvailableSeparately = false;
  
  fetchAnimeInfo(animeId, ...args) {
      throw new Error("Method 'fetchAnimeInfo' must be implemented.")
  }

  fetchEpisodeSources(episodeId, ...args) {
    throw new Error("Method 'fetchEpisodeSources' must be implemented.")
  }

  fetchEpisodeServers(episodeId, ...args) {
    throw new Error("Method 'fetchEpisodeServers' must be implemented.")
  }
}

module.exports = AnimeParser;
