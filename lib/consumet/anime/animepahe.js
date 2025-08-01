const { load } = require('cheerio');
const { AnimeParser, MediaStatus } = require('../models');
const { USER_AGENT } = require('../utils');
const TorWebSocketProxy = require('../models/tor-websocket-proxy');

class AnimePahe extends AnimeParser {
  name = 'AnimePahe';
  baseUrl = 'https://animepahe.ru';
  logo = 'https://animepahe.com/pikacon.ico';
  classPath = 'ANIME.AnimePahe';

  constructor(proxyConfig, adapter, customAgent) {
    super(proxyConfig, adapter, customAgent);
    
    // Initialize Tor WebSocket proxy
    this.torProxy = new TorWebSocketProxy();
    console.log('🧅 AnimePahe initialized with Tor WebSocket proxy');
  }

  search = async (query) => {
    try {
      // Use Tor proxy for the request
      const response = await this.torProxy.request(
        `${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.Headers(false)
        }
      );
      const data = response.data;

      const res = {
        results: data.data.map((item) => ({
          id: item.session,
          title: item.title,
          image: item.poster,
          rating: item.score,
          releaseDate: item.year,
          type: item.type,
        })),
      };

      return res;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchAnimeInfo = async (id, episodePage = -1) => {
    const animeInfo = {
      id: id,
      title: '',
    };

    try {
      // Use Tor proxy for the request
      const response = await this.torProxy.request(
        `${this.baseUrl}/anime/${id}`,
        {
          method: 'GET',
          headers: this.Headers(id)
        }
      );
      const $ = load(response.data);

      animeInfo.title = $('div.title-wrapper > h1 > span').first().text();
      animeInfo.image = $('div.anime-poster a').attr('href');
      animeInfo.cover = `https:${$('div.anime-cover').attr('data-src')}`;
      animeInfo.description = $('div.anime-summary').text().trim();
      animeInfo.genres = $('div.anime-genre ul li')
        .map((i, el) => $(el).find('a').attr('title'))
        .get();
      animeInfo.hasSub = true;

      switch ($('div.anime-info p:icontains("Status:") a').text().trim()) {
        case 'Currently Airing':
          animeInfo.status = MediaStatus.ONGOING;
          break;
        case 'Finished Airing':
          animeInfo.status = MediaStatus.COMPLETED;
          break;
        default:
          animeInfo.status = MediaStatus.UNKNOWN;
      }
      animeInfo.type = $('div.anime-info > p:contains("Type:") > a')
        .text()
        .trim()
        .toUpperCase();
      animeInfo.releaseDate = $('div.anime-info > p:contains("Aired:")')
        .text()
        .split('to')[0]
        .replace('Aired:', '')
        .trim();
      animeInfo.studios = $('div.anime-info > p:contains("Studio:")')
        .text()
        .replace('Studio:', '')
        .trim()
        .split('\n');

      animeInfo.totalEpisodes = parseInt(
        $('div.anime-info > p:contains("Episodes:")').text().replace('Episodes:', '')
      );
      
      animeInfo.episodes = [];
      if (episodePage < 0) {
        // Use Tor proxy for episode data request
        const episodeResponse = await this.torProxy.request(
          `${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`,
          {
            method: 'GET',
            headers: this.Headers(id)
          }
        );
        const { last_page, data } = episodeResponse.data;

        animeInfo.episodePages = last_page;

        animeInfo.episodes.push(
          ...data.map(
            (item) =>
              ({
                id: `${id}/${item.session}`,
                number: item.episode,
                title: item.title,
                image: item.snapshot,
                duration: item.duration,
                url: `${this.baseUrl}/play/${id}/${item.session}`,
              })
          )
        );

        for (let i = 1; i < last_page; i++) {
          animeInfo.episodes.push(...(await this.fetchEpisodes(id, i + 1)));
        }
      } else {
        animeInfo.episodes.push(...(await this.fetchEpisodes(id, episodePage)));
      }

      return animeInfo;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchEpisodeSources = async (episodeId) => {
    try {
      // Use Tor proxy for episode sources request
      const response = await this.torProxy.request(
        `${this.baseUrl}/play/${episodeId}`,
        {
          method: 'GET',
          headers: this.Headers(episodeId.split('/')[0])
        }
      );
      const data = response.data;

      const $ = load(data);

      const paheWinLinks = $('div#pickDownload > a');
      
      const kwikUrlPromises = [];

      paheWinLinks.each((i, el) => {
        const paheWinUrl = $(el).attr('href');
        const quality = $(el).text();
        kwikUrlPromises.push(this.Kwix(paheWinUrl).then(kwikUrl => ({ url: kwikUrl, quality: quality })));
      });

      const kwikUrls = await Promise.all(kwikUrlPromises);
      
      const sources = [];
      const downloads = [];

      const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.O0FKaqhJjEZgCAVfZoLz6Pjd7Gs9Kv6qi0P8RyATjaE';
      const workerUrl = 'https://access-kwik.apex-cloud.workers.dev/';

      const directLinkPromises = kwikUrls.map(async (item) => {
        try {
          // Use Tor proxy for worker URL request
          const response = await this.torProxy.request(workerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': USER_AGENT,
            },
            data: {
              service: 'kwik',
              action: 'fetch',
              content: { kwik: item.url },
              auth: authToken,
            }
          });

          if(response.data?.status && response.data?.content?.url) {
            sources.push({
              url: response.data.content.url,
              isM3U8: response.data.content.url.includes('.m3u8'),
              quality: `Direct - ${item.quality}`
            });
          }
        } catch(err) {
          console.error(`Failed to get direct link for ${item.url}`, err);
        }

        downloads.push({
          url: item.url,
          quality: item.quality,
        });
      });

      await Promise.all(directLinkPromises);

      return {
        headers: {
          Referer: 'https://kwik.cx/',
        },
        sources: sources,
        download: downloads,
      };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  async Kwix(pahe) {
    // Use Tor proxy for Kwix request
    const response = await this.torProxy.request(pahe, {
      method: 'GET',
      headers: this.Headers(false)
    });
    
    const res = /(?<kwik>https?:\/\/kwik.[a-z]+\/f\/.[^"]+)/.exec(response.data);
    return res.groups['kwik'];
  }

  fetchEpisodes = async (session, page) => {
    // Use Tor proxy for episodes request
    const response = await this.torProxy.request(
      `${this.baseUrl}/api?m=release&id=${session}&sort=episode_asc&page=${page}`,
      {
        method: 'GET',
        headers: this.Headers(session)
      }
    );

    const epData = response.data.data;

    return [
      ...epData.map(
        (item) => ({
          id: `${session}/${item.session}`,
          number: item.episode,
          title: item.title,
          image: item.snapshot,
          duration: item.duration,
          url: `${this.baseUrl}/play/${session}/${item.session}`,
        })
      ),
    ];
  };

  fetchEpisodeServers = (episodeLink) => {
    throw new Error('Method not implemented.');
  };

  Headers(sessionId) {
    return {
      'authority': 'animepahe.ru',
      'accept': 'application/json, text/javascript, */*; q=0.01',
      'accept-language': 'en-US,en;q=0.9',
      'cookie': '__ddg2_=;',
      'dnt': '1',
      'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      'referer': sessionId ? `${this.baseUrl}/anime/${sessionId}` : `${this.baseUrl}`,
      'user-agent': USER_AGENT,
    };
  }
}

module.exports = AnimePahe;
