const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/youtube/search?q=참치마요&recipeId=1
router.get('/search', async (req, res) => {
  const { q, recipeId } = req.query;
  if (!q) return res.status(400).json({ error: '검색어가 필요합니다.' });

  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + ' 레시피')}&type=video&maxResults=3&order=viewCount&regionCode=KR&relevanceLanguage=ko&key=${apiKey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.items || data.items.length === 0) return res.json([]);

    const videos = data.items.map(item => ({
      videoId:   item.id.videoId,
      title:     item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      url:       `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    // 첫 번째 영상을 DB에 캐싱 (youtube_url이 아직 없을 때만)
    if (recipeId && videos.length > 0) {
      await db.query(
        'UPDATE recipe SET youtube_title = ?, youtube_url = ? WHERE id = ? AND youtube_url IS NULL',
        [videos[0].title, videos[0].url, parseInt(recipeId)]
      );
    }

    res.json(videos);
  } catch (err) {
    console.error('[YouTube API]', err);
    res.status(500).json({ error: 'YouTube 검색 실패' });
  }
});

module.exports = router;
