const BaseProvider = require('./base-provider');
const BaseParser = require('./base-parser');
const AnimeParser = require('./anime-parser');
const VideoExtractor = require('./video-extractor');
const types = require('./types');

module.exports = {
  BaseProvider,
  BaseParser,
  AnimeParser,
  VideoExtractor,
  ...types,
};
