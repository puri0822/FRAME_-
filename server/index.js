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

// SPA fallback
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../yorijori/index.html'))
);

app.listen(PORT, () =>
  console.log(`요리조리 서버 실행 중 → http://localhost:${PORT}`)
);
