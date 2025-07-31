const express = require('express');
const AnimePahe = require('../lib/consumet/anime/animepahe');

const router = express.Router();
const animepahe = new AnimePahe();

router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const data = await animepahe.search(query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/info/:animeId', async (req, res) => {
  try {
    const animeId = req.params.animeId;
    const data = await animepahe.fetchAnimeInfo(animeId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sources/:episodeId/:episodeSession', async (req, res) => {
    try {
        const episodeId = `${req.params.episodeId}/${req.params.episodeSession}`;
        const data = await animepahe.fetchEpisodeSources(episodeId);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
