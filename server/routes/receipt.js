const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const db      = require('../db');

const LAMBDA_URL   = 'https://4ur32pd547.execute-api.ap-northeast-2.amazonaws.com/receipt';
const CHAT_LAMBDA  = 'https://4ur32pd547.execute-api.ap-northeast-2.amazonaws.com/chat';

const VALID_CATEGORIES = new Set(['채소/과일', '육류/수산', '유제품', '가공/편의점', '양념']);

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

/* ── POST /api/receipt/estimate-ingredient ─────────────────
   재료명 하나 → 카테고리 + 유통기한 동시 추정 (이름 수정 후 재추정용)
───────────────────────────────────────────────────────────── */
router.post('/estimate-ingredient', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '재료명이 없습니다.' });

  const prompt = `식재료 "${name}"에 대해 아래 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.
{
  "category": "채소/과일" | "육류/수산" | "유제품" | "가공/편의점" | "양념",
  "expiryDays": 숫자
}
category는 반드시 5가지 중 하나. expiryDays는 냉장/상온 보관 기준 평균 유통기한(일수).`;

  try {
    const lambdaRes = await fetch(CHAT_LAMBDA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt }),
    });
    const data = await lambdaRes.json();
    const jsonMatch = (data.reply || '').match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    res.json(result);
  } catch (err) {
    console.error('[estimate-ingredient] 오류:', err.message);
    res.status(500).json({ error: '추정 실패' });
  }
});

/* ── POST /api/receipt/estimate-expiry ─────────────────────
   재료 이름 목록 → Lambda(Claude) → 유통기한 일수 추정
───────────────────────────────────────────────────────────── */
router.post('/estimate-expiry', async (req, res) => {
  const { ingredients } = req.body;
  if (!Array.isArray(ingredients) || ingredients.length === 0)
    return res.status(400).json({ error: '재료 목록이 없습니다.' });

  const prompt = `다음 식재료들의 냉장 보관 기준 평균 유통기한을 일(day) 단위로 추정해줘.
반드시 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.
형식: {"재료명": 일수}
상온 보관 식품(라면, 통조림 등)은 실제 유통기한 기준으로 추정해줘.

재료: ${ingredients.join(', ')}`;

  try {
    const lambdaRes = await fetch(CHAT_LAMBDA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt }),
    });
    const data = await lambdaRes.json();
    const jsonMatch = (data.reply || '').match(/\{[\s\S]*\}/);
    const expiry = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    res.json({ expiry });
  } catch (err) {
    console.error('[estimate-expiry] 오류:', err.message);
    res.status(500).json({ error: '유통기한 추정 실패', expiry: {} });
  }
});

/* ── POST /api/receipt/save ────────────────────────────────
   식재료 목록 → RDS ingredient 테이블 저장
───────────────────────────────────────────────────────────── */
router.post('/save', async (req, res) => {
  const { ingredients, user_id } = req.body;

  if (!user_id) return res.status(400).json({ error: '로그인이 필요합니다.' });

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: '저장할 재료가 없습니다.' });
  }

  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let saved = 0;

    for (const item of ingredients) {
      const name        = (item.name || '').trim();
      const count       = Math.max(1, parseInt(item.count) || 1);
      const category_id = VALID_CATEGORIES.has(item.category_id) ? item.category_id : '채소/과일';
      const expiry_date = item.expiryDate || null; // YYYY-MM-DD or null
      if (!name) continue;

      await db.query(
        `INSERT INTO ingredient
           (user_id, category_id, name, count, expiry_date, expiry_status, created_at)
         VALUES (?, ?, ?, ?, ?, 'ok', ?)`,
        [user_id, category_id, name, count, expiry_date, now]
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
