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
    const { category, search } = req.query;
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
      ORDER BY r.id
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

module.exports = router;
