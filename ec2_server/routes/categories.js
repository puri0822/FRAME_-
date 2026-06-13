const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/recipe-categories
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, image_url, sort_order FROM recipe_category ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '카테고리를 불러오지 못했습니다.' });
  }
});

module.exports = router;
