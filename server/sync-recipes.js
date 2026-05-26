require('dotenv').config();
const db = require('./db');

const API_KEY = process.env.FOOD_API_KEY;
const BASE_URL = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/COOKRCP01/json`;
const PAGE_SIZE = 100;

// 식품안전나라 카테고리 → DB 카테고리 매핑
const CATEGORY_MAP = {
  '반찬':   '한식',
  '국&찌개': '국&찌개',
  '후식':   '한식',
  '간식':   '한식',
  '주식':   '한식',
  '일품':   '한식',
  '기타':   '한식',
};

// 재료 텍스트에서 이름만 추출
function parseIngredients(partsText) {
  if (!partsText) return [];
  const results = [];
  const lines = partsText.split('\n');

  for (const line of lines) {
    const items = line.split(',');
    for (const item of items) {
      const trimmed = item.trim();
      // 괄호·숫자·단위 제거 후 첫 한글/영문 단어 추출
      const match = trimmed.match(/^([가-힣a-zA-Z][가-힣a-zA-Z\s]*?)(?:\s*[\d(]|$)/);
      if (match) {
        const name = match[1].trim();
        if (name.length >= 2) results.push(name);
      }
    }
  }
  return [...new Set(results)];
}

// MANUAL01~MANUAL20 에서 조리 단계 추출
function parseSteps(recipe) {
  const steps = [];
  for (let i = 1; i <= 20; i++) {
    const key = `MANUAL${String(i).padStart(2, '0')}`;
    const step = (recipe[key] || '').replace(/[a-z]$/, '').trim(); // 말미 알파벳 제거
    if (step) steps.push(step);
  }
  return steps;
}

// 카테고리가 없으면 삽입
async function ensureCategories() {
  const categories = [
    { id: '한식',     image_url: '/images/rcat/korean.png',      sort_order: 1 },
    { id: '양식',     image_url: '/images/rcat/western.png',     sort_order: 5 },
    { id: '국&찌개',  image_url: '/images/rcat/soup.png',        sort_order: 6 },
    { id: '다이어트', image_url: '/images/rcat/diet.png',        sort_order: 4 },
    { id: '간편식',   image_url: '/images/rcat/easy.png',        sort_order: 2 },
  ];
  for (const cat of categories) {
    await db.query(
      `INSERT IGNORE INTO recipe_category (id, image_url, sort_order) VALUES (?, ?, ?)`,
      [cat.id, cat.image_url, cat.sort_order]
    );
  }
}

async function syncRecipes() {
  console.log('[sync] 식품안전나라 레시피 동기화 시작');

  await ensureCategories();

  // 현재 DB에 있는 레시피 이름 목록
  const [existing] = await db.query('SELECT name FROM recipe');
  const existingNames = new Set(existing.map(r => r.name));

  // 다음 ID 계산
  const [[maxRow]] = await db.query('SELECT MAX(id) as maxId FROM recipe');
  let nextId = (maxRow.maxId || 21) + 1;

  // 전체 건수 파악
  const firstRes = await fetch(`${BASE_URL}/1/1`);
  const firstData = await firstRes.json();
  const total = parseInt(firstData.COOKRCP01.total_count, 10);
  console.log(`[sync] API 전체 레시피: ${total}개 / DB 보유: ${existingNames.size}개`);

  let added = 0;

  for (let start = 1; start <= total; start += PAGE_SIZE) {
    const end = Math.min(start + PAGE_SIZE - 1, total);
    const res  = await fetch(`${BASE_URL}/${start}/${end}`);
    const data = await res.json();
    const rows = data.COOKRCP01?.row || [];

    for (const r of rows) {
      const name = r.RCP_NM?.trim();
      if (!name || existingNames.has(name)) continue;

      const category   = CATEGORY_MAP[r.RCP_PAT2] || '한식';
      const imageUrl   = r.ATT_FILE_NO_MAIN || '';
      const steps      = parseSteps(r);
      const ingredients = parseIngredients(r.RCP_PARTS_DTLS);

      // recipe 삽입
      await db.query(
        `INSERT INTO recipe (id, category_id, name, image_url, cook_time_min, difficulty, is_published)
         VALUES (?, ?, ?, ?, 30, '보통', 1)`,
        [nextId, category, name, imageUrl]
      );

      // 재료 삽입 (앞 3개를 핵심 재료로)
      for (let i = 0; i < ingredients.length; i++) {
        await db.query(
          `INSERT INTO recipe_ingredient (recipe_id, ingredient_name, is_key) VALUES (?, ?, ?)`,
          [nextId, ingredients[i], i < 3 ? 1 : 0]
        );
      }

      // 조리 단계 삽입
      for (let i = 0; i < steps.length; i++) {
        await db.query(
          `INSERT INTO recipe_step (recipe_id, step_order, description) VALUES (?, ?, ?)`,
          [nextId, i + 1, steps[i]]
        );
      }

      existingNames.add(name);
      nextId++;
      added++;
    }

    console.log(`[sync] ${end}/${total} 처리 완료 (이번 배치 신규: ${added}개)`);
  }

  console.log(`[sync] 동기화 완료 — 총 ${added}개 추가`);
  return added;
}

// 직접 실행 시 즉시 동기화
if (require.main === module) {
  syncRecipes().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { syncRecipes };
