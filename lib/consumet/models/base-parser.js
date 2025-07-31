const BaseProvider = require('./base-provider');

class BaseParser extends BaseProvider {
  search(query, ...args) {
    throw new Error("Method 'search' must be implemented.")
  }
}

module.exports = BaseParser;
