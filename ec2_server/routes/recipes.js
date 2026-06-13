const express = require('express');
const router  = express.Router();
const db      = require('../db');

function parseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function toAppRecipe(row) {
  return {
    id:             row.id,
    emoji:          '🍽️',
    name:           row.name,
    category:       row.category_id,
    ingredients:    parseJson(row.ingredients),
    keyIngredients: parseJson(row.key_ingredients),
    time:           row.cook_time_min,
    difficulty:     row.difficulty,
    instructions:   parseJson(row.steps),
    youtube_title:  row.youtube_title || `${row.name} 만들기`,
    youtube_url:    row.youtube_url   || null,
    likes:          parseInt(row.like_count)   || 0,
    rating:         parseFloat(row.avg_rating) || 0,
    imageUrl:       row.image_url     || null,
    source:         'db',
  };
}

// GET /api/recipes
router.get('/', async (req, res) => {
  try {
    const { category, search, random, limit } = req.query;
    const params = [];
    let   where  = 'WHERE r.is_published = 1';

    if (category && category !== '전체') {
      params.push(category);
      where += ' AND r.category_id = ?';
    }
    if (search) {
      params.push(`%${search}%`, `%${search}%`);
      where += ` AND (r.name LIKE ? OR EXISTS (
        SELECT 1 FROM recipe_ingredient ri2
        WHERE ri2.recipe_id = r.id AND ri2.ingredient_name LIKE ?
      ))`;
    }

    const orderBy = random ? 'ORDER BY RAND()' : 'ORDER BY r.id';
    const limitSql = (random && limit) ? `LIMIT ${parseInt(limit)}` : '';

    const sql = `
      SELECT
        r.id, r.name, r.category_id, r.image_url, r.cook_time_min, r.difficulty,
        r.youtube_title, r.youtube_url,
        COALESCE(AVG(rv.rating), 0)                                    AS avg_rating,
        SUM(CASE WHEN rv.is_liked = 1 THEN 1 ELSE 0 END)               AS like_count,
        (SELECT JSON_ARRAYAGG(ingredient_name)
           FROM recipe_ingredient WHERE recipe_id = r.id)              AS ingredients,
        (SELECT JSON_ARRAYAGG(ingredient_name)
           FROM recipe_ingredient WHERE recipe_id = r.id AND is_key=1) AS key_ingredients,
        (SELECT JSON_ARRAYAGG(s.description)
           FROM (SELECT description FROM recipe_step
                 WHERE recipe_id = r.id ORDER BY step_order) s)        AS steps
      FROM recipe r
      LEFT JOIN recipe_review rv ON rv.recipe_id = r.id
      ${where}
      GROUP BY r.id
      ${orderBy}
      ${limitSql}
    `;

    const [rows] = await db.query(sql, params);
    res.json(rows.map(toAppRecipe));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '레시피를 불러오지 못했습니다.' });
  }
});

// GET /api/recipes/trending  (반드시 /:id 앞에 위치)
router.get('/trending', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        r.id, r.name, r.category_id, r.image_url, r.cook_time_min, r.difficulty,
        r.youtube_title, r.youtube_url,
        COALESCE(AVG(rv.rating), 0)                                    AS avg_rating,
        SUM(CASE WHEN rv.is_liked = 1 THEN 1 ELSE 0 END)               AS like_count,
        (SELECT JSON_ARRAYAGG(ingredient_name)
           FROM recipe_ingredient WHERE recipe_id = r.id)              AS ingredients,
        (SELECT JSON_ARRAYAGG(ingredient_name)
           FROM recipe_ingredient WHERE recipe_id = r.id AND is_key=1) AS key_ingredients,
        (SELECT JSON_ARRAYAGG(s.description)
           FROM (SELECT description FROM recipe_step
                 WHERE recipe_id = r.id ORDER BY step_order) s)        AS steps
      FROM recipe r
      LEFT JOIN recipe_review rv ON rv.recipe_id = r.id
      WHERE r.is_published = 1
      GROUP BY r.id
      ORDER BY like_count DESC
      LIMIT 10
    `);
    res.json(rows.map(toAppRecipe));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '트렌딩 레시피를 불러오지 못했습니다.' });
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID' });

    const [rows] = await db.query(`
      SELECT
        r.id, r.name, r.category_id, r.image_url, r.cook_time_min, r.difficulty,
        r.youtube_title, r.youtube_url,
        COALESCE(AVG(rv.rating), 0)                                    AS avg_rating,
        SUM(CASE WHEN rv.is_liked = 1 THEN 1 ELSE 0 END)               AS like_count,
        (SELECT JSON_ARRAYAGG(ingredient_name)
           FROM recipe_ingredient WHERE recipe_id = r.id)              AS ingredients,
        (SELECT JSON_ARRAYAGG(ingredient_name)
           FROM recipe_ingredient WHERE recipe_id = r.id AND is_key=1) AS key_ingredients,
        (SELECT JSON_ARRAYAGG(s.description)
           FROM (SELECT description FROM recipe_step
                 WHERE recipe_id = r.id ORDER BY step_order) s)        AS steps
      FROM recipe r
      LEFT JOIN recipe_review rv ON rv.recipe_id = r.id
      WHERE r.id = ?
      GROUP BY r.id
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: '레시피 없음' });

    const recipe = toAppRecipe(rows[0]);

    const [rvRows] = await db.query(`
      SELECT u.nickname AS \`user\`, rv.rating,
             rv.comment AS text,
             DATE_FORMAT(rv.created_at, '%Y.%m.%d') AS date
      FROM recipe_review rv
      JOIN \`user\` u ON u.id = rv.user_id
      WHERE rv.recipe_id = ?
      ORDER BY rv.created_at DESC
    `, [id]);

    recipe.reviews = rvRows;
    res.json(recipe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '레시피를 불러오지 못했습니다.' });
  }
});

// POST /api/recipes/:id/reviews
router.post('/:id/reviews', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) return res.status(400).json({ error: '잘못된 ID' });

    const { userId, nickname, rating, comment } = req.body;
    if (!userId || rating == null) return res.status(400).json({ error: '필수 값 누락' });

    const r = parseFloat(rating);
    if (isNaN(r) || r < 0.5 || r > 5.0) return res.status(400).json({ error: '별점 범위 오류 (0.5 ~ 5.0)' });

    // user 없으면 INSERT IGNORE로 생성 (Google OAuth 유저가 아직 DB에 없을 경우 대비)
    if (nickname) {
      await db.query(
        `INSERT IGNORE INTO \`user\` (id, nickname, provider) VALUES (?, ?, 'google')`,
        [userId, nickname]
      );
    }

    // 동일 유저+레시피 리뷰는 덮어쓰기
    await db.query(
      `INSERT INTO recipe_review (recipe_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), created_at = NOW()`,
      [recipeId, userId, r, comment || null]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '리뷰 저장 실패' });
  }
});

module.exports = router;
