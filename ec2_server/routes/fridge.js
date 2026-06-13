'use strict';

const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/fridge/:userId
router.get('/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT ingredients FROM user_fridge WHERE user_id = ?',
      [req.params.userId]
    );
    if (!rows.length) return res.json([]);
    const raw  = rows[0].ingredients;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error('[fridge GET]', err);
    res.status(500).json({ error: '냉장고 조회 실패' });
  }
});

// PUT /api/fridge/:userId
router.put('/:userId', async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) return res.status(400).json({ error: '잘못된 형식' });

    await db.query(
      `INSERT INTO user_fridge (user_id, ingredients)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE ingredients = VALUES(ingredients), updated_at = NOW()`,
      [req.params.userId, JSON.stringify(ingredients)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[fridge PUT]', err);
    res.status(500).json({ error: '냉장고 저장 실패' });
  }
});

module.exports = router;
