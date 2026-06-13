const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const recipesRouter    = require('./routes/recipes');
const categoriesRouter = require('./routes/categories');
const youtubeRouter    = require('./routes/youtube');
const receiptRouter    = require('./routes/receipt');
const fridgeRouter     = require('./routes/fridge');
const db               = require('./db');
const { syncRecipes }  = require('./sync-recipes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 프론트엔드 정적 파일
app.use(express.static(path.join(__dirname, '../yorijori')));

// API
app.use('/api/recipes',          recipesRouter);
app.use('/api/recipe-categories', categoriesRouter);
app.use('/api/youtube',           youtubeRouter);
app.use('/api/receipt',           receiptRouter);
app.use('/api/fridge',            fridgeRouter);

// 구글 로그인 API
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: '토큰이 없습니다.' });

  try {
    // Google 토큰 검증
    const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload  = await tokenRes.json();

    if (payload.error || payload.aud !== '412792507622-0e2psgrf1tusb2fdbfv4cqfg5us0fabp.apps.googleusercontent.com') {
      return res.status(401).json({ error: '유효하지 않은 토큰' });
    }

    const { sub: googleId, name, email, picture } = payload;

    // DB에 유저 upsert
    await db.query(`
      INSERT INTO \`user\` (id, nickname, email, provider)
      VALUES (?, ?, ?, 'google')
      ON DUPLICATE KEY UPDATE nickname = VALUES(nickname)
    `, [googleId, name, email]);

    res.json({ id: googleId, name, email, picture });
  } catch (err) {
    console.error('[google auth]', err);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

// 챗봇 API
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  const structuredPrompt = `사용자 메시지를 분석해서 반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.

{
  "intent": "FRIDGE_SAVE" | "RECIPE_SEARCH" | "CHAT",
  "items": [{"name": "재료명", "count": 숫자, "category": "채소/과일" | "육류/수산" | "유제품" | "가공/편의점" | "양념"}],
  "query": "검색어",
  "reply": "사용자에게 보여줄 친근한 한국어 응답"
}

- FRIDGE_SAVE: 냉장고에 재료를 저장/추가/넣어달라는 요청. items 배열 필수.
- RECIPE_SEARCH: 특정 요리의 레시피를 알려달라는 요청. query 필수.
- CHAT: 그 외 일반 대화. items, query 생략 가능.

카테고리 기준: 채소·과일·버섯·두부 → "채소/과일", 고기·생선·해산물 → "육류/수산", 우유·치즈·버터·계란 → "유제품", 라면·통조림·빵 → "가공/편의점", 간장·된장·소금·설탕·기름 → "양념"

사용자 메시지: "${message}"`;

  try {
    const response = await fetch('https://4ur32pd547.execute-api.ap-northeast-2.amazonaws.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: structuredPrompt })
    });
    const data = await response.json();

    // JSON 파싱 시도
    let parsed;
    try {
      const jsonMatch = (data.reply || '').match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    // JSON 파싱 실패 시 그대로 반환
    if (!parsed) return res.json({ reply: data.reply || '응답을 받지 못했어요.' });

    const result = { reply: parsed.reply || data.reply };

    if (parsed.intent === 'FRIDGE_SAVE' && Array.isArray(parsed.items) && parsed.items.length > 0) {
      result.action = { type: 'FRIDGE_SAVE', items: parsed.items };

    } else if (parsed.intent === 'RECIPE_SEARCH' && parsed.query) {
      // 공백으로 분리 + 2글자 이상 n-gram으로 보조 키워드 생성
      const words = parsed.query.split(/\s+/).filter(w => w.length >= 2);
      if (words.length === 0) words.push(parsed.query);

      // 2글자 슬라이딩 윈도우 추가 (한국어 합성어 대응)
      const fullQ = parsed.query.replace(/\s+/g, '');
      const ngrams = [];
      for (let i = 0; i + 2 <= fullQ.length; i++) ngrams.push(fullQ.slice(i, i + 2));
      const keywords = [...new Set([...words, ...ngrams])];

      const nameConds  = keywords.map(() => 'r.name LIKE ?').join(' OR ');
      const ingrConds  = keywords.map(() =>
        'EXISTS (SELECT 1 FROM recipe_ingredient ri WHERE ri.recipe_id = r.id AND ri.ingredient_name LIKE ?)'
      ).join(' OR ');
      const params = [...keywords.map(w => `%${w}%`), ...keywords.map(w => `%${w}%`)];

      const [rows] = await db.query(`
        SELECT r.id, r.name, r.image_url, r.cook_time_min, r.difficulty,
               (SELECT JSON_ARRAYAGG(ingredient_name)
                FROM recipe_ingredient WHERE recipe_id = r.id AND is_key = 1) AS key_ingredients
        FROM recipe r
        WHERE r.is_published = 1 AND (${nameConds} OR ${ingrConds})
        GROUP BY r.id
        LIMIT 3
      `, params);
      result.action = { type: 'RECIPE_SEARCH', recipes: rows, query: parsed.query };
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '챗봇 오류가 발생했습니다.' });
  }
});

// 음성 인식 API
app.post('/api/scan', express.raw({ type: 'audio/*', limit: '10mb' }), async (req, res) => {
  try {
    const audioBase64 = req.body.toString('base64');
    const response = await fetch('https://4ur32pd547.execute-api.ap-northeast-2.amazonaws.com/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: audioBase64 })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '음성 인식 오류가 발생했습니다.' });
  }
});

// 닉네임 GET
app.get('/api/user/:userId/nickname', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT nickname FROM `user` WHERE id = ?', [req.params.userId]);
    res.json({ nickname: rows.length ? rows[0].nickname : null });
  } catch (err) {
    console.error('[nickname GET]', err);
    res.status(500).json({ error: '닉네임 조회 실패' });
  }
});

// 닉네임 PUT
app.put('/api/user/:userId/nickname', async (req, res) => {
  try {
    const { nickname, email } = req.body;
    if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력해주세요' });
    await db.query(
      `INSERT INTO \`user\` (id, nickname, email, provider) VALUES (?, ?, ?, 'google_mobile')
       ON DUPLICATE KEY UPDATE nickname = VALUES(nickname)`,
      [req.params.userId, nickname.trim(), email || '']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[nickname PUT]', err);
    res.status(500).json({ error: '닉네임 저장 실패' });
  }
});

// 채팅 히스토리 GET — 최근 20개 반환
app.get('/api/chat/history/:userId', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, role, message FROM chat_history WHERE user_id = ? ORDER BY created_at ASC',
      [req.params.userId]
    );
    const msgs = rows.slice(-20).map(r => ({ id: r.id, role: r.role, text: r.message }));
    res.json(msgs);
  } catch (err) {
    console.error('[chat history GET]', err);
    res.status(500).json({ error: '히스토리 조회 실패' });
  }
});

// 채팅 히스토리 PUT — 기존 삭제 후 재삽입
app.put('/api/chat/history/:userId', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: '잘못된 형식' });
    await db.query('DELETE FROM chat_history WHERE user_id = ?', [req.params.userId]);
    if (messages.length > 0) {
      const values = messages.map(m => [req.params.userId, m.role === 'user' ? 'user' : 'ai', m.text || '']);
      await db.query('INSERT INTO chat_history (user_id, role, message) VALUES ?', [values]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[chat history PUT]', err);
    res.status(500).json({ error: '히스토리 저장 실패' });
  }
});

// SPA fallback
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../yorijori/index.html'))
);

app.listen(PORT, () => {
  console.log(`요리조리 서버 실행 중 → http://localhost:${PORT}`);

  // user_fridge 테이블 자동 생성
  db.query(`
    CREATE TABLE IF NOT EXISTS user_fridge (
      user_id    VARCHAR(255) PRIMARY KEY,
      ingredients LONGTEXT     NOT NULL DEFAULT '[]',
      updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `).catch(e => console.error('[migration] user_fridge 생성 실패:', e.message));

  // 서버 시작 후 초기 동기화
  syncRecipes().catch(e => console.error('[sync] 초기 동기화 실패:', e.message));

  // 매일 새벽 3시 재동기화 (ms 단위)
  const msUntil3am = () => {
    const now  = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  };
  setTimeout(function schedule() {
    syncRecipes().catch(e => console.error('[sync] 정기 동기화 실패:', e.message));
    setTimeout(schedule, 24 * 60 * 60 * 1000);
  }, msUntil3am());
});
