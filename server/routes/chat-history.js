const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/chat/history/:userId — 사용자 채팅 기록 불러오기
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT role, message, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[chat-history GET]', err);
    res.status(500).json({ error: '기록을 불러오지 못했습니다.' });
  }
});

// POST /api/chat/history — 메시지 저장
router.post('/', async (req, res) => {
  const { userId, role, message } = req.body;
  if (!userId || !role || !message) return res.status(400).json({ error: '필수 값 누락' });

  try {
    await db.query(
      'INSERT INTO chat_history (user_id, role, message) VALUES (?, ?, ?)',
      [userId, role, message]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[chat-history POST]', err);
    res.status(500).json({ error: '저장에 실패했습니다.' });
  }
});

// DELETE /api/chat/history/:userId — 사용자 채팅 기록 전체 삭제
router.delete('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query('DELETE FROM chat_history WHERE user_id = ?', [userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[chat-history DELETE]', err);
    res.status(500).json({ error: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
