const Proxy = require('./proxy');

class BaseProvider extends Proxy {
  name = 'Unknown';
  baseUrl = 'http://localhost';
  languages = 'en';
  isNSFW = false;
  logo = 'https://png.pngtree.com/png-vector/20210221/ourmid/pngtree-error-404-not-found-neon-effect-png-image_2928214.jpg';
  classPath = 'BaseProvider';
  isWorking = true;

  get toString() {
    return {
      name: this.name,
      baseUrl: this.baseUrl,
      lang: this.languages,
      isNSFW: this.isNSFW,
      logo: this.logo,
      classPath: this.classPath,
      isWorking: this.isWorking,
    };
  }
}

module.exports = BaseProvider;
