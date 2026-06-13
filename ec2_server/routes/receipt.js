const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const db      = require('../db');

const LAMBDA_URL = 'https://4ur32pd547.execute-api.ap-northeast-2.amazonaws.com/receipt';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* ── POST /api/receipt/analyze ─────────────────────────────
   이미지 → Lambda(/receipt) → Bedrock Vision → 식재료 목록 반환
───────────────────────────────────────────────────────────── */
router.post('/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지가 없습니다.' });

  try {
    const imageBase64 = req.file.buffer.toString('base64');
    const mediaType   = req.file.mimetype || 'image/jpeg';

    console.log('[receipt] Lambda 분석 중...');

    const lambdaRes = await fetch(LAMBDA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, mediaType }),
    });

    const data = await lambdaRes.json();

    if (!lambdaRes.ok) throw new Error(data.error || 'Lambda 분석 실패');

    console.log('[receipt] 식재료:', data.ingredients);
    res.json({ success: true, ingredients: data.ingredients });

  } catch (err) {
    console.error('[receipt] 오류:', err.message);
    res.status(500).json({ error: '영수증 분석 실패', detail: err.message });
  }
});

/* ── POST /api/receipt/save ────────────────────────────────
   식재료 목록 → RDS ingredient 테이블 저장
───────────────────────────────────────────────────────────── */
router.post('/save', async (req, res) => {
  const { ingredients, user_id = 'guest' } = req.body;

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: '저장할 재료가 없습니다.' });
  }

  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let saved = 0;

    for (const item of ingredients) {
      const name        = (item.name || '').trim();
      const count       = parseInt(item.count) || 1;
      const category_id = item.category_id || '기타';
      if (!name) continue;

      await db.query(
        `INSERT INTO ingredient
           (user_id, category_id, name, count, expiry_status, created_at)
         VALUES (?, ?, ?, ?, '정상', ?)`,
        [user_id, category_id, name, count, now]
      );
      saved++;
    }

    res.json({ success: true, saved });
  } catch (err) {
    console.error('[receipt] 저장 오류:', err.message);
    res.status(500).json({ error: '재료 저장 실패', detail: err.message });
  }
});

module.exports = router;
