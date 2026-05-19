const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const recipesRouter    = require('./routes/recipes');
const categoriesRouter = require('./routes/categories');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 프론트엔드 정적 파일
app.use(express.static(path.join(__dirname, '../yorijori')));

// API
app.use('/api/recipes',          recipesRouter);
app.use('/api/recipe-categories', categoriesRouter);

// 챗봇 API
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const response = await fetch('https://4ur32pd547.execute-api.ap-northeast-2.amazonaws.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
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

// SPA fallback
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../yorijori/index.html'))
);

app.listen(PORT, () =>
  console.log(`요리조리 서버 실행 중 → http://localhost:${PORT}`)
);
