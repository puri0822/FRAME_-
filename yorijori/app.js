'use strict';

/* =========================================
   Storage — localStorage 유틸리티
   ========================================= */
const Storage = {
  /**
   * 키에 해당하는 값을 읽어 파싱 후 반환.
   * 값이 없거나 파싱 실패 시 fallback 반환.
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  },

  /** 값을 JSON 직렬화하여 저장. */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  },

  /** 키를 스토리지에서 제거. */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  },
};


/* =========================================
   Api — 백엔드 REST 통신
   ========================================= */
const Api = (() => {
  const BASE = '/api';

  async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`API ${path} 실패: ${res.status}`);
    return res.json();
  }

  /** DB 레시피 전체 로드 */
  async function loadRecipes() {
    try {
      const dbRecipes = await get('/recipes');
      RECIPES.length = 0;
      dbRecipes.forEach(r => RECIPES.push(r));
    } catch (e) {
      console.warn('API 레시피 로드 실패 (오프라인 모드):', e.message);
    }
  }

  /** 단일 레시피 상세 (steps + reviews) */
  async function fetchRecipe(id) {
    return get(`/recipes/${id}`);
  }

  return { loadRecipes, fetchRecipe };
})();


/* =========================================
   Router — SPA 탭 네비게이션
   ========================================= */
const Router = (() => {
  const pages    = document.querySelectorAll('.page');
  const navItems = document.querySelectorAll('.nav-item');

  // 탭 바에 표시되는 최상위 페이지
  const TAB_PAGES = new Set(['home', 'fridge', 'explore']);

  let currentPage  = null;
  let previousPage = null; // back() 에서 사용

  /**
   * pageId에 해당하는 페이지로 전환.
   * TAB_PAGES 에 없는 서브 페이지(add-ingredient 등)는
   * 부모 탭 하이라이트를 그대로 유지하고 localStorage에 저장하지 않는다.
   */
  function navigateTo(pageId) {
    if (pageId === currentPage) return;

    pages.forEach(p => p.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    if (!targetPage) {
      console.warn(`[Router] 알 수 없는 페이지: "${pageId}"`);
      return;
    }

    // 탭 페이지이면 해당 nav 활성화, 서브 페이지이면 이전 탭 nav 유지
    if (TAB_PAGES.has(pageId)) {
      document.querySelector(`.nav-item[data-page="${pageId}"]`)?.classList.add('active');
      Storage.set('yorijori_tab', pageId);
    } else {
      const parentNav = document.querySelector(`.nav-item[data-page="${previousPage}"]`);
      parentNav?.classList.add('active');
    }

    targetPage.classList.add('active');
    targetPage.scrollTop = 0;
    previousPage = currentPage;
    currentPage  = pageId;

    if (pageId === 'explore' && typeof Explore !== 'undefined') {
      Explore.refreshRecos();
    }
  }

  function back() {
    if (previousPage) navigateTo(previousPage);
  }

  function init() {
    navItems.forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });

    const saved = Storage.get('yorijori_tab', 'home');
    navigateTo(TAB_PAGES.has(saved) ? saved : 'home');
  }

  return { init, navigateTo, back };
})();


/* =========================================
   식재료 자동완성 DB
   ========================================= */
const ingredientDB = [
  // 채소
  '계란', '대파', '양파', '마늘', '생강',
  '감자', '당근', '배추', '무', '고추',
  '오이', '토마토', '버섯', '시금치', '깻잎',
  '애호박', '브로콜리', '파프리카', '상추', '쪽파',
  // 육류 · 수산
  '돼지고기', '소고기', '닭고기', '베이컨', '스팸',
  '참치캔', '고추참치캔', '어묵', '새우', '햄',
  // 두부 · 유제품
  '두부', '슬라이스 치즈', '우유', '버터', '계란',
  // 곡류 · 가공식품
  '찬밥', '밥', '라면', '컵라면', '냉동 만두',
  '냉동 채소', '냉동 떡볶이', '부침가루', '밀가루', '김',
  // 양념 · 조미료
  '된장', '고추장', '간장', '소금', '설탕',
  '참기름', '식용유', '마요네즈', '올리고당', '후추',
  // 기타
  '김치', '묵은 김치', '두유', '삼각김밥', '멸치',
];


/* =========================================
   Fridge — 냉장고 재료 관리
   ========================================= */
const Fridge = (() => {
  const KEY = 'yorijori_ingredients';

  const CATEGORIES = [
    { id: '채소/과일',   label: '채소/과일',   color: '#16A34A' },
    { id: '육류/수산',   label: '육류/수산',   color: '#E05454' },
    { id: '유제품',      label: '유제품',      color: '#3B9EE0' },
    { id: '가공/편의점', label: '가공/편의점', color: '#FF6B35' },
    { id: '양념',        label: '양념',        color: '#E8A020' },
  ];

  const TAB_ALL    = '전체';
  const TAB_URGENT = '임박 🚨';
  let activeFilter = TAB_ALL;

  /** 재료 이름 → 이모지 매핑 */
  const INGR_EMOJI = {
    '계란':'🥚','달걀':'🥚',
    '대파':'🌿','파':'🌿','쪽파':'🌿',
    '양파':'🧅',
    '마늘':'🧄',
    '생강':'🫚',
    '감자':'🥔','고구마':'🍠',
    '당근':'🥕',
    '배추':'🥬','양배추':'🥬','시금치':'🥬','깻잎':'🌿','상추':'🥬','무':'🥬',
    '고추':'🌶️','청양고추':'🌶️',
    '오이':'🥒',
    '토마토':'🍅',
    '버섯':'🍄',
    '두부':'🫘','콩':'🫘',
    '돼지고기':'🥩','삼겹살':'🥩','목살':'🥩',
    '소고기':'🥩','쇠고기':'🥩',
    '닭고기':'🍗','닭가슴살':'🍗','닭다리':'🍗',
    '생선':'🐟','연어':'🐟','참치':'🐟','고등어':'🐟','갈치':'🐟',
    '새우':'🦐','오징어':'🦑','게':'🦀',
    '김치':'🥢',
    '쌀':'🍚','밥':'🍚',
    '라면':'🍜','국수':'🍜',
    '파스타':'🍝','스파게티':'🍝',
    '빵':'🍞','식빵':'🍞',
    '치즈':'🧀',
    '우유':'🥛',
    '버터':'🧈',
    '된장':'🫙','간장':'🫙','고추장':'🫙','소금':'🧂',
    '설탕':'🍬','식용유':'🫙','참기름':'🫙',
    '베이컨':'🥓','소시지':'🌭','햄':'🥩',
    '사과':'🍎','배':'🍐','바나나':'🍌','귤':'🍊','포도':'🍇',
    '양념':'🫙','후추':'🧂',
  };

  const CAT_EMOJI_MAP = {
    '채소/과일':'🥬','육류/수산':'🥩','유제품':'🧀','가공/편의점':'🥫','양념':'🫙',
  };

  function getIngredientEmoji(name, category) {
    return INGR_EMOJI[name] || CAT_EMOJI_MAP[category] || '🥘';
  }

  /** 재료 배열. 각 항목: { id: number, name: string, category: string, expiry: string, count: number } */
  let items = [];

  /** 냉장고 페이지에서 다중 선택된 재료 id 목록 */
  let selectedIngredients = [];

  /** 수정 바텀시트를 여는 함수 (init()에서 주입) */
  let openEditSheet = null;

  /* ---------- 데이터 읽기/쓰기 ---------- */

  function load() {
    const raw = Storage.get(KEY, []);

    // 배열이 아니면 초기화
    if (!Array.isArray(raw)) { items = []; return; }

    // 이전 버전(문자열 배열) 마이그레이션
    if (raw.length && typeof raw[0] === 'string') {
      items = raw.map((name, i) => ({ id: Date.now() + i, name, category: '냉장' }));
      Storage.set(KEY, items);
      return;
    }

    // 손상된 항목 필터링: id·name·category 모두 있어야 함
    items = raw.filter(i =>
      i &&
      typeof i === 'object' &&
      typeof i.name === 'string' && i.name.trim() &&
      (typeof i.id === 'number' || typeof i.id === 'string') &&
      typeof i.category === 'string'
    );

    // 필터링 후 항목 수가 달라졌으면 복구 저장
    if (items.length !== raw.length) Storage.set(KEY, items);
  }

  function save() {
    Storage.set(KEY, items);
  }

  /* ---------- CRUD ---------- */

  function add(name, category, expiry, count = 1) {
    const trimmed = name.trim();
    if (!trimmed) return false;
    // 같은 카테고리 내 동일 이름 중복 방지
    if (items.some(i => i.name === trimmed && i.category === category)) return false;

    items.push({ id: Date.now(), name: trimmed, category, expiry: expiry || '', count: Math.max(1, count) });
    save();
    render();
    return true;
  }

  function remove(id) {
    items = items.filter(i => i.id !== id);
    // 삭제된 재료가 선택 목록에 있으면 함께 제거
    const selIdx = selectedIngredients.indexOf(id);
    if (selIdx !== -1) selectedIngredients.splice(selIdx, 1);
    save();
    render();
    updateRecipeSearchBtn();
  }

  function update(id, count, expiry) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.count  = Math.max(1, count);
    item.expiry = expiry || '';
    save();
    render();
  }

  /* ---------- 렌더링 ---------- */

  function buildIngredientItem(item) {
    const li = document.createElement('li');
    li.className = 'ingredient-item';
    if (selectedIngredients.includes(item.id)) li.classList.add('selected');

    const photo = document.createElement('div');
    photo.className = 'ingr-photo';
    photo.textContent = getIngredientEmoji(item.name, item.category);

    const body = document.createElement('div');
    body.className = 'ingredient-item-body';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ingredient-name';
    nameSpan.textContent = item.name;
    body.appendChild(nameSpan);

    const expirySpan = document.createElement('span');
    if (item.expiry) {
      const expiryInfo = getExpiryInfo(item.expiry);
      expirySpan.className = `expiry-label ${expiryInfo.status}`;
      expirySpan.textContent = expiryInfo.text;
    } else {
      expirySpan.className = 'expiry-label';
      expirySpan.textContent = '유통기한 미설정';
    }
    body.appendChild(expirySpan);

    const countBadge = document.createElement('span');
    countBadge.className = 'ingr-count';
    countBadge.textContent = `${item.count ?? 1}개`;

    const editBtn = document.createElement('button');
    editBtn.className = 'ingr-edit-btn';
    editBtn.setAttribute('aria-label', `${item.name} 수정`);
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      openEditSheet?.(item);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.setAttribute('aria-label', `${item.name} 삭제`);
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      remove(item.id);
    });

    // 카드 클릭 시 선택 토글 (삭제·수정 버튼 제외)
    li.addEventListener('click', () => {
      const idx = selectedIngredients.indexOf(item.id);
      if (idx === -1) {
        selectedIngredients.push(item.id);
        li.classList.add('selected');
      } else {
        selectedIngredients.splice(idx, 1);
        li.classList.remove('selected');
      }
      updateRecipeSearchBtn();
    });

    li.append(photo, body, countBadge, editBtn, removeBtn);
    return li;
  }

  function render() {
    const container = document.getElementById('fridge-content');
    if (!container) return;

    container.innerHTML = '';

    if (items.length === 0) {
      container.appendChild(createEmptyState(
        '🧊', '냉장고가 비어있어요', '재료 추가 버튼으로 재료를 등록해 보세요!'
      ));
      return;
    }

    /* ── 임박 탭: 유통기한 3일 이내 재료 모아보기 ── */
    if (activeFilter === TAB_URGENT) {
      const urgentItems = items.filter(item => {
        if (!item.expiry) return false;
        const info = getExpiryInfo(item.expiry);
        return info.status === 'expired' || info.status === 'warning';
      });

      if (urgentItems.length === 0) {
        container.appendChild(createEmptyState(
          '✅', '임박 재료 없음', '유통기한이 3일 이내인 재료가 없어요!'
        ));
        return;
      }

      const ul = document.createElement('ul');
      ul.className = 'ingredient-list';
      urgentItems.forEach(item => ul.appendChild(buildIngredientItem(item)));
      container.appendChild(ul);
      return;
    }

    /* ── 전체 / 카테고리 탭 ── */
    const visibleCats = activeFilter === TAB_ALL
      ? CATEGORIES
      : CATEGORIES.filter(c => c.id === activeFilter);

    let hasAny = false;
    visibleCats.forEach(cat => {
      const catItems = items.filter(i => i.category === cat.id);
      if (catItems.length === 0) return;

      const group = document.createElement('div');
      group.className = 'fridge-group';

      const header = document.createElement('div');
      header.className = 'fridge-group-header';

      const badge = document.createElement('span');
      badge.className = 'category-badge';
      badge.style.setProperty('--cat-color', cat.color);
      badge.textContent = cat.label;

      const countEl = document.createElement('span');
      countEl.className = 'category-count';
      countEl.textContent = `${catItems.length}개`;

      header.append(badge, countEl);
      group.appendChild(header);

      const ul = document.createElement('ul');
      ul.className = 'ingredient-list';
      catItems.forEach(item => ul.appendChild(buildIngredientItem(item)));

      group.appendChild(ul);
      container.appendChild(group);
      hasAny = true;
    });

    if (!hasAny) {
      container.appendChild(createEmptyState(
        '🔍', '해당 카테고리에 재료가 없어요', '재료 추가 버튼으로 등록해 보세요!'
      ));
    }
  }

  /* ---------- 초기화 ---------- */

  /* ---------- 자동완성 ---------- */

  // 자동완성 항목 선택 직후 Enter-추가 핸들러가 중복 실행되는 것을 막는 플래그
  let suppressNextAdd = false;

  function initAutocomplete(input) {
    // 입력창을 relative 래퍼로 감싸 드롭다운의 기준점으로 사용
    const wrap = document.createElement('div');
    wrap.className = 'ingredient-input-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const dropdown = document.createElement('ul');
    dropdown.className = 'autocomplete-list';
    dropdown.hidden = true;
    wrap.appendChild(dropdown);

    let activeIdx = -1;

    function showSuggestions(q) {
      const trimmed = q.trim();
      if (!trimmed) { hideDropdown(); return; }

      // 중복 제거된 DB에서 입력값 포함 항목 필터링 (최대 8개)
      const seen = new Set();
      const matches = ingredientDB.filter(name => {
        if (seen.has(name)) return false;
        seen.add(name);
        return name.includes(trimmed);
      }).slice(0, 8);

      if (matches.length === 0) { hideDropdown(); return; }

      activeIdx = -1;
      dropdown.innerHTML = '';
      matches.forEach(name => {
        const li = document.createElement('li');
        li.className = 'autocomplete-item';
        li.setAttribute('role', 'option');

        // 일치 구간 강조
        const idx = name.indexOf(trimmed);
        li.innerHTML =
          escapeHtml(name.slice(0, idx)) +
          `<mark>${escapeHtml(trimmed)}</mark>` +
          escapeHtml(name.slice(idx + trimmed.length));

        // mousedown: blur 이전에 처리 (preventDefault로 포커스 유지)
        li.addEventListener('mousedown', e => {
          e.preventDefault();
          selectItem(name);
        });

        dropdown.appendChild(li);
      });

      dropdown.hidden = false;
    }

    function hideDropdown() {
      dropdown.hidden = true;
      activeIdx = -1;
    }

    function selectItem(name) {
      input.value = name;
      hideDropdown();
      input.focus();
    }

    function setActive(idx) {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      items.forEach((el, i) => el.classList.toggle('active', i === idx));
      activeIdx = idx;
    }

    function escapeHtml(str) {
      return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    input.addEventListener('input', e => showSuggestions(e.target.value));

    input.addEventListener('keydown', e => {
      if (dropdown.hidden) return;
      const items = dropdown.querySelectorAll('.autocomplete-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIdx + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIdx - 1, 0));
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        suppressNextAdd = true;
        selectItem(items[activeIdx].textContent);
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    // 다른 곳 클릭 시 드롭다운 닫기 (mousedown이 먼저 처리된 후 blur 발생)
    input.addEventListener('blur', () => setTimeout(hideDropdown, 150));
  }

  /* ---------- 재료 카탈로그 데이터 ---------- */

  const INGR_CATALOG = [
    // 채소/과일
    { name: '계란',       cat: '채소/과일' },
    { name: '대파',       cat: '채소/과일' },
    { name: '양파',       cat: '채소/과일' },
    { name: '마늘',       cat: '채소/과일' },
    { name: '생강',       cat: '채소/과일' },
    { name: '감자',       cat: '채소/과일' },
    { name: '당근',       cat: '채소/과일' },
    { name: '배추',       cat: '채소/과일' },
    { name: '무',         cat: '채소/과일' },
    { name: '고추',       cat: '채소/과일' },
    { name: '오이',       cat: '채소/과일' },
    { name: '토마토',     cat: '채소/과일' },
    { name: '버섯',       cat: '채소/과일' },
    { name: '시금치',     cat: '채소/과일' },
    { name: '깻잎',       cat: '채소/과일' },
    { name: '애호박',     cat: '채소/과일' },
    { name: '브로콜리',   cat: '채소/과일' },
    { name: '파프리카',   cat: '채소/과일' },
    { name: '상추',       cat: '채소/과일' },
    { name: '쪽파',       cat: '채소/과일' },
    // 육류/수산
    { name: '돼지고기',   cat: '육류/수산' },
    { name: '소고기',     cat: '육류/수산' },
    { name: '닭고기',     cat: '육류/수산' },
    { name: '베이컨',     cat: '육류/수산' },
    { name: '스팸',       cat: '육류/수산' },
    { name: '참치캔',     cat: '육류/수산' },
    { name: '고추참치캔', cat: '육류/수산' },
    { name: '어묵',       cat: '육류/수산' },
    { name: '새우',       cat: '육류/수산' },
    { name: '햄',         cat: '육류/수산' },
    { name: '멸치',       cat: '육류/수산' },
    // 유제품
    { name: '두부',           cat: '유제품' },
    { name: '슬라이스 치즈',  cat: '유제품' },
    { name: '우유',           cat: '유제품' },
    { name: '버터',           cat: '유제품' },
    { name: '두유',           cat: '유제품' },
    // 가공/편의점
    { name: '밥',           cat: '가공/편의점' },
    { name: '라면',         cat: '가공/편의점' },
    { name: '컵라면',       cat: '가공/편의점' },
    { name: '냉동 만두',    cat: '가공/편의점' },
    { name: '냉동 채소',    cat: '가공/편의점' },
    { name: '냉동 떡볶이',  cat: '가공/편의점' },
    { name: '부침가루',     cat: '가공/편의점' },
    { name: '밀가루',       cat: '가공/편의점' },
    { name: '김',           cat: '가공/편의점' },
    { name: '김치',         cat: '가공/편의점' },
    { name: '묵은 김치',    cat: '가공/편의점' },
    { name: '삼각김밥',     cat: '가공/편의점' },
    // 양념
    { name: '된장',     cat: '양념' },
    { name: '고추장',   cat: '양념' },
    { name: '간장',     cat: '양념' },
    { name: '소금',     cat: '양념' },
    { name: '설탕',     cat: '양념' },
    { name: '참기름',   cat: '양념' },
    { name: '식용유',   cat: '양념' },
    { name: '마요네즈', cat: '양념' },
    { name: '올리고당', cat: '양념' },
    { name: '후추',     cat: '양념' },
  ];

  /* ---------- 초기화 ---------- */

  function init() {
    load();
    render();

    /* 카테고리 탭 */
    document.querySelectorAll('.fridge-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeFilter = tab.dataset.cat;
        document.querySelectorAll('.fridge-tab').forEach(t =>
          t.classList.toggle('active', t === tab)
        );
        render();
      });
    });

    /* ── 재료 추가 페이지 ── */

    // 뒤로가기
    document.getElementById('add-ingr-back-btn')
      ?.addEventListener('click', () => Router.back());

    // ── 상태 ──
    let catalogCat   = '전체';
    let catalogSort  = '가나다';
    let catalogQuery = '';

    /** selectedIngredients: [{ name, image, count, expiry, cat }] */
    let selectedIngredients = [];

    const catalogEl   = document.getElementById('add-ingr-catalog');
    const searchEl    = document.getElementById('add-ingr-search');
    const sortEl      = document.getElementById('add-ingr-sort');
    const selectedBar = document.getElementById('ingr-selected-bar');
    const selectedLbl = document.getElementById('ingr-selected-label');

    /* 카테고리별 태그 색상 */
    const CAT_STYLE = {
      '채소/과일':   { bg: 'rgba(22,163,74,0.1)',   color: '#16A34A' },
      '육류/수산':   { bg: 'rgba(224,84,84,0.1)',    color: '#E05454' },
      '유제품':      { bg: 'rgba(59,158,224,0.1)',   color: '#3B9EE0' },
      '가공/편의점': { bg: 'rgba(255,107,53,0.1)',   color: '#FF6B35' },
      '양념':        { bg: 'rgba(232,160,32,0.1)',   color: '#E8A020' },
    };

    /* 토스트 */
    const toastWrap = document.createElement('div');
    toastWrap.className = 'toast-wrap';
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastWrap.appendChild(toastEl);
    (document.getElementById('app') || document.body).appendChild(toastWrap);

    let toastTimer = null;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
    }

    /* selectedIngredients 변경 후 UI 동기화 */
    function syncSelectedBar() {
      const n = selectedIngredients.length;
      if (n === 0) {
        selectedBar?.classList.add('hidden');
      } else {
        selectedBar?.classList.remove('hidden');
        if (selectedLbl) selectedLbl.textContent = `${n}개 선택됨`;
      }
    }

    /* 카드의 체크 표시를 selectedIngredients 기준으로 업데이트 */
    function syncCardState(card, name) {
      const isSelected = selectedIngredients.some(s => s.name === name);
      card.classList.toggle('added', isSelected);
      const existing = card.querySelector('.catalog-check');
      if (isSelected && !existing) {
        const check = document.createElement('span');
        check.className = 'catalog-check';
        check.setAttribute('aria-label', '선택됨');
        check.textContent = '✓';
        card.appendChild(check);
      } else if (!isSelected && existing) {
        existing.remove();
      }
    }

    /* ── 바텀시트 ── */
    const detailOverlay  = document.getElementById('ingr-detail-overlay');
    const detailSheet    = document.getElementById('ingr-detail-sheet');
    const detailExpiryEl = document.getElementById('detail-expiry');
    let   detailItem     = null; // 현재 편집 중인 catalog item
    let   detailCount    = 1;
    let   detailCard     = null; // 연결된 카드 DOM

    /** 오늘 날짜를 yyyy-mm-dd 형식으로 반환 */
    function todayStr() {
      const d  = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    }

    // 바텀시트가 열릴 때 잠글 스크롤 컨테이너
    // — 이 SPA에서 body가 아닌 .page 요소가 실제 스크롤 컨테이너
    const pageScrollEl = document.getElementById('page-add-ingredient');

    function lockScroll() {
      if (pageScrollEl) pageScrollEl.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden'; // 추가 안전망 (일부 브라우저)
    }

    function unlockScroll() {
      if (pageScrollEl) pageScrollEl.style.overflow = '';
      document.body.style.overflow = '';        // 클린업
    }

    function openDetailSheet(item, card) {
      detailItem  = item;
      detailCard  = card;
      detailCount = 1;

      document.getElementById('ingr-detail-emoji').textContent =
        getIngredientEmoji(item.name, item.cat);
      document.getElementById('ingr-detail-name').textContent = item.name;
      document.getElementById('ingr-detail-cat').textContent  = item.cat;
      document.getElementById('detail-count-display').textContent = '1';
      // 유통기한 기본값 = 오늘
      if (detailExpiryEl) detailExpiryEl.value = todayStr();

      detailOverlay.setAttribute('aria-hidden', 'false');
      detailOverlay.classList.add('open');
      lockScroll(); // 배경 스크롤 잠금
    }

    function closeDetailSheet() {
      detailOverlay.classList.remove('open');
      detailOverlay.setAttribute('aria-hidden', 'true');
      unlockScroll(); // 배경 스크롤 복구 (클린업)
      // 시트를 닫을 때는 카드 상태를 건드리지 않음 (취소 시 선택 안 된 상태 유지)
      detailItem = null;
      detailCard = null;
    }

    // 갯수 +/-
    document.getElementById('detail-count-minus')?.addEventListener('click', () => {
      if (detailCount > 1) {
        detailCount--;
        document.getElementById('detail-count-display').textContent = detailCount;
      }
    });
    document.getElementById('detail-count-plus')?.addEventListener('click', () => {
      detailCount++;
      document.getElementById('detail-count-display').textContent = detailCount;
    });

    // 유통기한 단축 버튼
    document.querySelectorAll('#ingr-detail-sheet .expiry-shortcut-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days, 10);
        const base = detailExpiryEl.value ? new Date(detailExpiryEl.value) : new Date();
        base.setDate(base.getDate() + days);
        const yyyy = base.getFullYear();
        const mm   = String(base.getMonth() + 1).padStart(2, '0');
        const dd   = String(base.getDate()).padStart(2, '0');
        detailExpiryEl.value = `${yyyy}-${mm}-${dd}`;
      });
    });

    // 취소 버튼 — 선택하지 않고 시트 닫기 (카드 상태 변경 없음)
    document.getElementById('detail-cancel-btn')?.addEventListener('click', closeDetailSheet);

    // 선택 완료 버튼
    document.getElementById('detail-confirm-btn')?.addEventListener('click', () => {
      if (!detailItem) return;
      const entry = {
        name:   detailItem.name,
        image:  getIngredientEmoji(detailItem.name, detailItem.cat),
        cat:    detailItem.cat,
        count:  detailCount,
        expiry: detailExpiryEl?.value || '',
      };
      selectedIngredients.push(entry);
      syncCardState(detailCard, detailItem.name);
      syncSelectedBar();
      closeDetailSheet();
      showToast(`✓ ${entry.name} 선택됨`);
    });

    // 오버레이 배경 클릭 시 닫기
    detailOverlay?.addEventListener('click', e => {
      if (e.target === detailOverlay) closeDetailSheet();
    });

    // 냉장고에 추가 (확정 바 버튼)
    document.getElementById('ingr-confirm-btn')?.addEventListener('click', () => {
      selectedIngredients.forEach(s => add(s.name, s.cat, s.expiry, s.count));
      const n = selectedIngredients.length;
      selectedIngredients = [];
      renderCatalog();        // 카드 상태 초기화
      syncSelectedBar();
      showToast(`✓ ${n}개 재료가 냉장고에 추가됐어요`);
      setTimeout(() => Router.back(), 600);
    });

    /* 카탈로그 렌더링 */
    function renderCatalog() {
      if (!catalogEl) return;

      let list = INGR_CATALOG.filter(item => {
        const matchCat   = catalogCat === '전체' || item.cat === catalogCat;
        const matchQuery = !catalogQuery || item.name.includes(catalogQuery);
        return matchCat && matchQuery;
      });

      if (catalogSort === '가나다') {
        list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      }

      if (list.length === 0) {
        catalogEl.innerHTML = '<p class="catalog-empty">검색 결과가 없어요 😅</p>';
        return;
      }

      catalogEl.innerHTML = '';
      list.forEach(item => {
        const isSelected = selectedIngredients.some(s => s.name === item.name);
        const emoji = getIngredientEmoji(item.name, item.cat);
        const style = CAT_STYLE[item.cat] || { bg: 'rgba(230,126,94,0.1)', color: '#E67E5E' };

        const card = document.createElement('button');
        card.className = 'catalog-card' + (isSelected ? ' added' : '');
        card.setAttribute('aria-label', `${item.name} ${isSelected ? '선택 취소' : '선택'}`);
        card.innerHTML = `
          <div class="catalog-img-wrap">${emoji}</div>
          <div class="catalog-card-body">
            <span class="catalog-name">${item.name}</span>
            <span class="catalog-cat-tag"
                  style="background:${style.bg};color:${style.color}">${item.cat}</span>
          </div>
          ${isSelected ? '<span class="catalog-check" aria-label="선택됨">✓</span>' : ''}
        `;

        card.addEventListener('click', () => {
          const idx = selectedIngredients.findIndex(s => s.name === item.name);
          if (idx !== -1) {
            // 이미 선택된 재료 → 선택 취소
            selectedIngredients.splice(idx, 1);
            syncCardState(card, item.name);
            syncSelectedBar();
          } else {
            // 미선택 재료 → 상세 입력 시트 열기
            openDetailSheet(item, card);
          }
        });

        catalogEl.appendChild(card);
      });
    }

    // 카테고리 탭
    document.querySelectorAll('.add-ingr-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        catalogCat = tab.dataset.cat;
        document.querySelectorAll('.add-ingr-tab').forEach(t =>
          t.classList.toggle('active', t === tab)
        );
        renderCatalog();
      });
    });

    // 검색
    searchEl?.addEventListener('input', e => {
      catalogQuery = e.target.value.trim();
      renderCatalog();
    });

    // 정렬
    sortEl?.addEventListener('change', e => {
      catalogSort = e.target.value;
      renderCatalog();
    });

    /** 카탈로그 카테고리를 설정하고 탭 UI도 동기화 */
    function setCatalogCat(cat) {
      catalogCat = cat;
      document.querySelectorAll('.add-ingr-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.cat === cat)
      );
      renderCatalog();
    }

    /* 재료 추가 버튼 → 전체 카탈로그로 이동 (기존 로직 유지) */
    function handleGoToAddIngredient() {
      Router.navigateTo('add-ingredient');
      setCatalogCat('전체');
    }

    /* 편의점 음식 추가 버튼 → 가공/편의점 카테고리로 직행 */
    function handleGoToConvenienceStore() {
      Router.navigateTo('add-ingredient');
      setCatalogCat('가공/편의점');
    }

    document.getElementById('open-add-ingr-btn')
      ?.addEventListener('click', handleGoToAddIngredient);

    document.getElementById('open-add-convenience-btn')
      ?.addEventListener('click', handleGoToConvenienceStore);

    /* ── 재료 수정 바텀시트 ── */
    const editOverlay    = document.getElementById('fridge-edit-overlay');
    const editExpiryEl   = document.getElementById('fridge-edit-expiry');
    const editCountDisp  = document.getElementById('fridge-edit-count-display');
    const fridgePage     = document.getElementById('page-fridge');
    let editTargetId     = null;
    let editCount        = 1;

    function todayStr() {
      const d  = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function closeEdit() {
      editOverlay?.classList.remove('open');
      editOverlay?.setAttribute('aria-hidden', 'true');
      if (fridgePage) fridgePage.style.overflow = '';
    }

    openEditSheet = function(item) {
      editTargetId  = item.id;
      editCount     = item.count ?? 1;

      document.getElementById('fridge-edit-emoji').textContent = getIngredientEmoji(item.name, item.category);
      document.getElementById('fridge-edit-name').textContent  = item.name;
      document.getElementById('fridge-edit-cat').textContent   = item.category;
      editCountDisp.textContent = editCount;
      if (editExpiryEl) editExpiryEl.value = item.expiry || todayStr();

      editOverlay?.setAttribute('aria-hidden', 'false');
      editOverlay?.classList.add('open');
      if (fridgePage) fridgePage.style.overflow = 'hidden';
    };

    document.getElementById('fridge-edit-count-minus')?.addEventListener('click', () => {
      if (editCount > 1) { editCount--; editCountDisp.textContent = editCount; }
    });
    document.getElementById('fridge-edit-count-plus')?.addEventListener('click', () => {
      editCount++; editCountDisp.textContent = editCount;
    });

    document.querySelectorAll('.fridge-edit-shortcut').forEach(btn => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days, 10);
        const base = editExpiryEl?.value ? new Date(editExpiryEl.value) : new Date();
        base.setDate(base.getDate() + days);
        if (editExpiryEl) {
          editExpiryEl.value =
            `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
        }
      });
    });

    document.getElementById('fridge-edit-cancel-btn')?.addEventListener('click', closeEdit);

    document.getElementById('fridge-edit-save-btn')?.addEventListener('click', () => {
      if (editTargetId == null) return;
      update(editTargetId, editCount, editExpiryEl?.value || '');
      closeEdit();
    });

    // 배경 클릭으로 닫기
    editOverlay?.addEventListener('click', e => {
      if (e.target === editOverlay) closeEdit();
    });
  }

  /* ---------- 레시피 검색 버튼 ---------- */

  function updateRecipeSearchBtn() {
    const btn = document.getElementById('fridge-recipe-search-btn');
    if (!btn) return;
    btn.hidden = selectedIngredients.length === 0;
  }

  /** 현재 선택된 재료 이름 배열 반환 */
  function getSelectedNames() {
    return items
      .filter(i => selectedIngredients.includes(i.id))
      .map(i => i.name);
  }

  return { init, updateRecipeSearchBtn, getSelectedNames, add, render };
})();


/* =========================================
   공용 헬퍼
   ========================================= */
const DIFF_COLOR = { '쉬움': '#16A34A', '보통': '#EA580C', '어려움': '#DC2626' };

/**
 * 유통기한 문자열('YYYY-MM-DD')을 받아 표시 텍스트와 상태를 반환.
 * @returns {{ text: string, status: 'expired'|'warning'|'ok' }}
 */
function getExpiryInfo(expiryStr) {
  const expiry = new Date(expiryStr);
  const today  = new Date();
  // 시간 제거 — 날짜 단위 비교
  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((expiry - today) / 86400000);

  const [, m, d] = expiryStr.split('-');
  const dateStr = `${parseInt(m)}/${parseInt(d)}`;

  if (diffDays < 0)  return { text: `~ ${dateStr} (만료)`,       status: 'expired' };
  if (diffDays === 0) return { text: `~ ${dateStr} (오늘 만료)`, status: 'expired' };
  if (diffDays <= 3)  return { text: `~ ${dateStr} (D-${diffDays})`, status: 'warning' };
  return { text: `~ ${dateStr}`, status: 'ok' };
}

/**
 * 빈 화면(Empty State) DOM 노드를 반환.
 * @param {string} icon  - 큰 이모지
 * @param {string} title - 굵은 제목
 * @param {string} desc  - 보조 설명
 */
function createEmptyState(icon, title, desc) {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  wrap.innerHTML = `
    <div class="empty-state-icon">${icon}</div>
    <p class="empty-state-title">${title}</p>
    <p class="empty-state-desc">${desc}</p>
  `;
  return wrap;
}


/* =========================================
   레시피 데이터 (API에서 로드)
   ========================================= */
const RECIPES = [];



/* =========================================
   레시피 리뷰 더미 데이터 (제거됨)
   ========================================= */
const RECIPE_REVIEWS = {};

/* =========================================
   레시피 텍스트 리뷰 더미 데이터 (제거됨)
   ========================================= */
const RECIPE_TEXT_REVIEWS = {};

/* =========================================
   SNS 트렌딩 데이터
   ========================================= */
const TREND_DATA = [];


/* =========================================
   Explore — 레시피 탐색 & 즐겨찾기
   ========================================= */
/* =========================================
   공용 헬퍼 — 레시피 이미지/이모지 렌더링
   ========================================= */
function setRecipeVisual(el, recipe) {
  if (recipe.imageUrl) {
    const img = document.createElement('img');
    img.src = recipe.imageUrl;
    img.alt = recipe.name;
    img.className = 'recipe-thumb-img';
    img.onerror = () => { el.removeChild(img); el.textContent = recipe.emoji || '🍽️'; };
    el.appendChild(img);
  } else {
    el.textContent = recipe.emoji || '🍽️';
  }
}

const Explore = (() => {
  const FAV_KEY = 'yorijori_favorites';

  // 숫자 타입만 허용하여 타입 불일치 방지
  const rawFavs = Storage.get(FAV_KEY, []);
  let favorites        = new Set(Array.isArray(rawFavs) ? rawFavs.filter(Number.isFinite) : []);
  let showFavOnly      = false;
  let query            = '';
  let activeCategory   = '전체';
  let fridgeIngredients = []; // 냉장고 다중 선택으로 전달된 재료 이름 목록

  /* RECIPES에 있는 카테고리 목록 — API 로드 후에도 최신 목록 반환 */
  function getCategoriesList() {
    return ['전체', ...new Set(RECIPES.map(r => r.category).filter(Boolean))];
  }

  /* ---------- 즐겨찾기 저장 ---------- */

  function saveFavorites() {
    Storage.set(FAV_KEY, [...favorites]);
  }

  /* ---------- 즐겨찾기 토글 (카드 전체 재렌더 없이 해당 버튼만 업데이트) ---------- */

  function toggleFavorite(id) {
    if (favorites.has(id)) {
      favorites.delete(id);
    } else {
      favorites.add(id);
    }
    saveFavorites();

    // 해당 카드의 하트 버튼만 상태 업데이트
    const card = document.querySelector(`.explore-card[data-id="${id}"]`);
    if (card) {
      const isFav = favorites.has(id);
      const btn   = card.querySelector('.heart-btn');
      if (btn) {
        btn.classList.toggle('active', isFav);
        btn.setAttribute('aria-label', isFav ? '즐겨찾기 해제' : '즐겨찾기 추가');
      }
    }

    // 즐겨찾기 모아보기 중이면 해제한 카드를 목록에서 제거
    if (showFavOnly) render();
  }

  /* ---------- 필터링 ---------- */

  function getFiltered() {
    const q = query.toLowerCase();
    let filtered = RECIPES.filter(r => {
      const matchSearch = !q
        || r.name.toLowerCase().includes(q)
        || r.ingredients.some(i => i.toLowerCase().includes(q));
      const matchFav = !showFavOnly || favorites.has(r.id);
      const matchCat = activeCategory === '전체' || r.category === activeCategory;
      return matchSearch && matchFav && matchCat;
    });

    if (fridgeIngredients.length > 0) {
      const lower = fridgeIngredients.map(n => n.toLowerCase());

      // 선택 재료 중 하나라도 포함하는 레시피만 남김
      filtered = filtered.filter(r =>
        r.ingredients.some(i => {
          const il = i.toLowerCase();
          return lower.some(n => il.includes(n) || n.includes(il));
        })
      );

      // 매칭 재료 수 기준 내림차순 정렬 (많이 일치할수록 앞으로)
      filtered.sort((a, b) => {
        const count = r =>
          r.ingredients.filter(i => {
            const il = i.toLowerCase();
            return lower.some(n => il.includes(n) || n.includes(il));
          }).length;
        return count(b) - count(a);
      });
    }

    return filtered;
  }

  /** 냉장고에서 선택된 재료 이름으로 탐색 페이지 필터 설정 */
  function filterByIngredients(names) {
    fridgeIngredients = names.slice();
    // 기존 필터 초기화
    query = '';
    activeCategory = '전체';
    showFavOnly = false;
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    document.getElementById('explore-search-wrap')?.classList.remove('open');
    renderCategoryChips();
    render();
  }

  /** 재료 필터 해제 */
  function clearFridgeFilter() {
    fridgeIngredients = [];
    renderCategoryChips();
    render();
  }

  /* ---------- 카테고리 칩 렌더링 ---------- */

  function renderCategoryChips() {
    const bar = document.getElementById('category-chips-bar');
    if (!bar) return;
    bar.innerHTML = '';

    // 전체
    const allBtn = document.createElement('button');
    allBtn.className = `category-chip${activeCategory === '전체' && !showFavOnly ? ' active' : ''}`;
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', String(activeCategory === '전체' && !showFavOnly));
    allBtn.textContent = '전체';
    allBtn.addEventListener('click', () => {
      if (activeCategory === '전체' && !showFavOnly) return;
      activeCategory = '전체';
      showFavOnly = false;
      renderCategoryChips();
      render();
    });
    bar.appendChild(allBtn);

    // 즐겨찾기
    const favBtn = document.createElement('button');
    favBtn.className = `category-chip fav-chip${showFavOnly ? ' active' : ''}`;
    favBtn.setAttribute('role', 'tab');
    favBtn.setAttribute('aria-selected', String(showFavOnly));
    favBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="${showFavOnly ? 'currentColor' : 'none'}" stroke="currentColor" style="flex-shrink:0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>즐겨찾기`;
    favBtn.addEventListener('click', () => {
      showFavOnly = !showFavOnly;
      if (showFavOnly) activeCategory = '전체';
      renderCategoryChips();
      render();
    });
    bar.appendChild(favBtn);

    // 카테고리
    getCategoriesList().filter(c => c !== '전체').forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `category-chip${cat === activeCategory && !showFavOnly ? ' active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(cat === activeCategory && !showFavOnly));
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        if (activeCategory === cat && !showFavOnly) return;
        activeCategory = cat;
        showFavOnly = false;
        renderCategoryChips();
        render();
      });
      bar.appendChild(btn);
    });
  }

  /* ---------- 카드 DOM 생성 ---------- */

  function buildCard(recipe) {
    const isFav = favorites.has(recipe.id);

    const article = document.createElement('article');
    article.className = 'explore-card';
    article.dataset.id = recipe.id;

    /* 메인 영역 (썸네일 + 정보) */
    const main = document.createElement('div');
    main.className = 'explore-card-main';

    const thumb = document.createElement('div');
    thumb.className = 'explore-card-thumb';
    setRecipeVisual(thumb, recipe);

    const body = document.createElement('div');
    body.className = 'explore-card-body';

    const nameRow = document.createElement('div');
    nameRow.className = 'explore-card-name-row';

    const nameEl = document.createElement('h3');
    nameEl.className = 'explore-card-name';
    nameEl.textContent = recipe.name;

    const ratingEl = document.createElement('span');
    ratingEl.className = 'explore-card-rating';
    ratingEl.innerHTML = `<svg class="rating-star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${(recipe.rating ?? 0).toFixed(1)}`;

    nameRow.append(nameEl, ratingEl);

    const ingrEl = document.createElement('p');
    ingrEl.className = 'explore-card-ingredients';
    ingrEl.textContent = recipe.ingredients.join(', ');

    const badges = document.createElement('div');
    badges.className = 'explore-card-badges';

    const timeBadge = document.createElement('span');
    timeBadge.className = 'badge badge-time';
    timeBadge.textContent = `⏱ ${recipe.time}분`;

    const diffBadge = document.createElement('span');
    diffBadge.className = 'badge badge-diff';
    diffBadge.textContent = recipe.difficulty;
    diffBadge.style.setProperty('--diff-color', DIFF_COLOR[recipe.difficulty] || '#888');

    badges.append(timeBadge, diffBadge);
    body.append(nameRow, ingrEl, badges);
    main.append(thumb, body);

    /* 하트 버튼 */
    const heartBtn = document.createElement('button');
    heartBtn.className = `heart-btn${isFav ? ' active' : ''}`;
    heartBtn.setAttribute('aria-label', isFav ? '즐겨찾기 해제' : '즐겨찾기 추가');
    heartBtn.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`;
    heartBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(recipe.id);
    });

    const heartCount = document.createElement('span');
    heartCount.className = 'heart-count';
    heartCount.textContent = (recipe.likes ?? 0).toLocaleString('ko-KR');

    const heartWrap = document.createElement('div');
    heartWrap.className = 'heart-wrap';
    heartWrap.append(heartBtn, heartCount);

    // 카드 클릭 → 상세 모달 (하트 버튼은 stopPropagation으로 제외됨)
    article.addEventListener('click', () => RecipeModal.open(recipe.id));

    article.append(main, heartWrap);
    return article;
  }

  /* ---------- 렌더링 ---------- */

  function render() {
    const list    = document.getElementById('explore-list');
    const countEl = document.getElementById('result-count');
    if (!list) return;

    const filtered = getFiltered();
    list.innerHTML = '';

    if (countEl) countEl.textContent = `${filtered.length}개`;

    // 냉장고 재료 필터 배너
    const banner = document.getElementById('fridge-filter-banner');
    if (banner) {
      if (fridgeIngredients.length > 0) {
        banner.hidden = false;
        // 재료 칩 목록 갱신
        const chipsEl = banner.querySelector('.fridge-filter-chips');
        if (chipsEl) {
          chipsEl.innerHTML = '';
          fridgeIngredients.forEach(name => {
            const chip = document.createElement('span');
            chip.className = 'fridge-filter-chip';
            chip.textContent = name;
            chipsEl.appendChild(chip);
          });
        }
      } else {
        banner.hidden = true;
      }
    }

    if (filtered.length === 0) {
      const emptyMsg = fridgeIngredients.length > 0
        ? createEmptyState('🧊', '일치하는 레시피가 없어요', '다른 재료를 선택하거나 필터를 해제해 보세요')
        : showFavOnly
          ? createEmptyState('🤍', '즐겨찾기한 레시피가 없어요', '레시피의 ♡ 버튼을 눌러\n추가해 보세요!')
          : createEmptyState('🔍', '검색 결과가 없어요', '다른 키워드로 검색해 보세요');
      list.appendChild(emptyMsg);
      return;
    }

    filtered.forEach(r => list.appendChild(buildCard(r)));
  }

  /* ---------- 내 재료 기반 추천 카드 ---------- */

  function buildRecoCard(recipe, myIngredients) {
    const card = document.createElement('div');
    card.className = 'reco-card reco-card--compact';

    const visual = document.createElement('div');
    visual.className = 'reco-card-visual';

    const emojiEl = document.createElement('div');
    emojiEl.className = 'reco-card-emoji';
    setRecipeVisual(emojiEl, recipe);

    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = `reco-card-bookmark${favorites.has(recipe.id) ? ' active' : ''}`;
    bookmarkBtn.setAttribute('aria-label', '즐겨찾기');
    bookmarkBtn.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`;
    bookmarkBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(recipe.id);
      bookmarkBtn.classList.toggle('active', favorites.has(recipe.id));
    });

    const ownedIngrs = recipe.ingredients.filter(ing => myIngredients.has(ing.toLowerCase()));
    const matchBadge = document.createElement('div');
    matchBadge.className = 'reco-match-badge';
    matchBadge.textContent = `${ownedIngrs.slice(0, 2).join(', ')} 포함 🌱`;

    visual.append(emojiEl, bookmarkBtn, matchBadge);

    const info = document.createElement('div');
    info.className = 'reco-card-info';

    const name = document.createElement('div');
    name.className = 'reco-card-name';
    name.textContent = recipe.name;

    const meta = document.createElement('div');
    meta.className = 'reco-card-meta';
    const diffColor = DIFF_COLOR[recipe.difficulty] || '#888';
    meta.innerHTML = `<span>⏱️ ${recipe.time}분</span><span class="reco-meta-sep">|</span><span style="color:${diffColor}">${recipe.difficulty}</span><span class="reco-meta-sep">|</span><span class="reco-card-rating-inline"><svg viewBox="0 0 24 24" class="rating-star rating-star--sm"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${(recipe.rating ?? 0).toFixed(1)}</span>`;

    info.append(name, meta);

    const ownedSet = new Set(ownedIngrs.map(i => i.toLowerCase()));
    const missingKey = recipe.keyIngredients.filter(ing => !ownedSet.has(ing.toLowerCase()));
    if (missingKey.length > 0) {
      const hint = document.createElement('div');
      hint.className = 'reco-card-hint';
      hint.textContent = missingKey.length === 1
        ? `${missingKey[0]}만 있으면 바로 완성!`
        : `${missingKey.slice(0, 2).join(', ')} 추가하면 완성!`;
      info.appendChild(hint);
    }

    card.append(visual, info);
    card.addEventListener('click', () => RecipeModal.open(recipe.id));
    return card;
  }

  function refreshRecos() {
    const strip = document.getElementById('explore-reco-strip');
    if (!strip) return;
    strip.innerHTML = '';

    const fridgeData    = Storage.get('yorijori_ingredients', []);
    const myIngredients = new Set(
      fridgeData.map(i => (typeof i === 'string' ? i : i.name).toLowerCase())
    );

    if (myIngredients.size === 0) {
      strip.appendChild(createEmptyState(
        '🧊', '냉장고가 비어있어요', '냉장고 탭에서 재료를 추가하면\n맞춤 레시피를 추천해 드려요!'
      ));
      return;
    }

    const scored = RECIPES
      .map(r => ({
        ...r,
        matchCount: r.ingredients.filter(ing => myIngredients.has(ing.toLowerCase())).length,
      }))
      .filter(r => r.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 6);

    if (scored.length === 0) {
      strip.appendChild(createEmptyState(
        '🥲', '맞는 레시피가 없어요', '재료를 더 추가하면 추천해 드릴게요!'
      ));
      return;
    }

    scored.forEach(r => strip.appendChild(buildRecoCard(r, myIngredients)));
  }

  /* ---------- 초기화 ---------- */

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  /* ---------- SNS 트렌딩 카드 ---------- */

  function buildTrendCard(trend, rank) {
    const recipe = RECIPES.find(r => r.id === trend.recipeId);
    if (!recipe) return null;

    const card = document.createElement('div');
    card.className = 'trend-card';

    /* 비주얼 영역 */
    const visual = document.createElement('div');
    visual.className = 'trend-card-visual';

    // 순위 뱃지
    const rankBadge = document.createElement('div');
    rankBadge.className = `trend-rank${rank <= 3 ? ' trend-rank--top' : ''}`;
    rankBadge.textContent = `${rank}위`;

    // 이모지
    const emojiEl = document.createElement('div');
    emojiEl.className = 'trend-card-emoji';
    setRecipeVisual(emojiEl, recipe);

    // 불꽃 오버레이 (1~3위만)
    if (rank <= 3) {
      const flame = document.createElement('div');
      flame.className = 'trend-flame';
      flame.textContent = '🔥';
      visual.appendChild(flame);
    }

    visual.append(rankBadge, emojiEl);

    /* 정보 영역 */
    const info = document.createElement('div');
    info.className = 'trend-card-info';

    // 이름 + 평점을 한 줄에
    const nameRow = document.createElement('div');
    nameRow.className = 'trend-card-name-row';

    const name = document.createElement('div');
    name.className = 'trend-card-name';
    name.textContent = recipe.name;

    const ratingBadge = document.createElement('span');
    ratingBadge.className = 'trend-rating-badge';
    ratingBadge.innerHTML = `<svg viewBox="0 0 24 24" class="rating-star rating-star--sm"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${(recipe.rating ?? 0).toFixed(1)}`;

    nameRow.append(name, ratingBadge);

    // 요리 중 인원 뱃지
    const countRow = document.createElement('div');
    countRow.className = 'trend-count-row';

    const countBadge = document.createElement('div');
    countBadge.className = 'trend-count-badge';
    countBadge.innerHTML = `🍳 <strong>${trend.count}명</strong> 요리 중`;

    countRow.append(countBadge);

    // 해시태그
    const tagRow = document.createElement('div');
    tagRow.className = 'trend-tag-row';
    trend.tags.forEach(tag => {
      const t = document.createElement('span');
      t.className = 'trend-tag';
      t.textContent = tag;
      tagRow.appendChild(t);
    });

    info.append(nameRow, countRow, tagRow);
    card.append(visual, info);
    card.addEventListener('click', () => RecipeModal.open(recipe.id));
    return card;
  }

  function renderTrendStrip() {
    const strip = document.getElementById('sns-trend-strip');
    if (!strip) return;
    strip.innerHTML = '';
    if (TREND_DATA.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'trend-empty';
      empty.textContent = '트렌딩 레시피를 불러오는 중...';
      strip.appendChild(empty);
      return;
    }
    TREND_DATA.forEach((trend, i) => {
      const card = buildTrendCard(trend, i + 1);
      if (card) strip.appendChild(card);
    });
  }

  async function loadTrending() {
    const TAG_POOL = [
      ['#SNS화제', '#쉬운요리'],
      ['#인기급상승', '#오늘뭐먹지'],
      ['#집밥', '#맛있어'],
      ['#10분요리', '#간단레시피'],
      ['#요리챌린지', '#밥스타그램'],
    ];
    try {
      const res = await fetch('/api/recipes/trending');
      if (!res.ok) return;
      const recipes = await res.json();
      TREND_DATA.length = 0;
      recipes.forEach((r, i) => {
        TREND_DATA.push({
          recipeId: r.id,
          count:    Math.floor(Math.random() * 350) + 80,
          tags:     TAG_POOL[i % TAG_POOL.length],
        });
      });
      renderTrendStrip();
    } catch (e) {
      console.error('[trending]', e);
    }
  }

  function init() {
    refreshRecos();
    renderTrendStrip();
    renderCategoryChips();
    render();

    const searchInput = document.getElementById('search-input');
    const searchBtn   = document.getElementById('explore-search-btn');
    const searchWrap  = document.getElementById('explore-search-wrap');

    // 검색 아이콘 토글
    searchBtn?.addEventListener('click', () => {
      const isOpen = searchWrap?.classList.toggle('open');
      if (isOpen) {
        searchInput?.focus();
      } else {
        query = '';
        if (searchInput) searchInput.value = '';
        render();
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', debounce(e => {
        query = e.target.value.trim();
        render();
      }, 180));
    }
  }

  return { init, render, refreshRecos, toggleFavorite, isFavorite: id => favorites.has(id), filterByIngredients, clearFridgeFilter, loadTrending };
})();


/* =========================================
   Home — AI 채팅 & 냉장고 파먹기 추천
   ========================================= */
const Home = (() => {

  /* ---------- 가짜 AI 응답 규칙 ---------- */
  const AI_RULES = [
    {
      keywords: ['안녕', '하이', 'hi', 'hello', '반가'],
      reply: '안녕하세요! 저는 요리조리 AI예요 🍳\n어떤 요리가 궁금하신가요?',
    },
    {
      keywords: ['편의점', '편튀', '컵라면'],
      reply: '편의점 재료로 뚝딱 만드는 레시피가 있어요! 🏪\n편의점 라면 나베나 참치마요 주먹밥은 어때요?',
    },
    {
      keywords: ['빠른', '간단', '쉬운', '빨리', '10분', '금방'],
      reply: '⚡ 빠르게 만들 수 있는 레시피 추천!\n• 참치마요 주먹밥 (10분)\n• 떡볶이 치즈 덮밥 (10분)\n• 삼각김밥 된장국 (10분)',
    },
    {
      keywords: ['계란', '달걀'],
      reply: '계란이 있으시군요! 🥚\n고추참치 계란말이나 냉장고 털이 볶음밥을 추천해요. 계란 하나로 식사가 완성돼요!',
    },
    {
      keywords: ['밥', '볶음밥', '찬밥'],
      reply: '찬밥 있으면 냉장고 털이 볶음밥이 최고예요 🍳\n냉동 채소 + 계란 + 간장만 있으면 15분 만에 완성!',
    },
    {
      keywords: ['두부'],
      reply: '두부가 있다면 두부 간장 조림을 강추해요 🥬\n재료도 간단하고 밥도둑 반찬으로 딱이에요!',
    },
    {
      keywords: ['고기', '육류', '스팸', '돼지', '소고기'],
      reply: '스팸이나 육류가 있다면 스팸 마늘종 볶음 어때요? 🥩\n고소하고 짭짤해서 밥 한 그릇 뚝딱이에요!',
    },
    {
      keywords: ['다이어트', '건강', '저칼로리', '가벼운'],
      reply: '건강한 요리를 원하신다면 두부 간장 조림이나 채소 볶음을 추천해요 🥗\n칼로리는 낮고 영양은 높아요!',
    },
    {
      keywords: ['김치'],
      reply: '묵은 김치가 있다면 김치 치즈 부침개를 만들어 보세요! 🥞\n고소한 치즈와 새콤한 김치의 조합이 환상이에요.',
    },
    {
      keywords: ['뭐 해먹', '뭐먹', '추천', '메뉴'],
      reply: '오늘 뭐 먹을지 고민이시군요 😄\n냉장고 탭에서 재료를 등록하시면 아래 "냉장고 파먹기" 섹션에서 맞춤 레시피를 추천해 드려요!',
    },
  ];

  /* ---------- 가짜 AI 응답 생성 ---------- */

  function getFakeResponse(text) {
    const lower = text.toLowerCase();

    // 냉장고 재료 관련 질문
    if (lower.includes('냉장고') || lower.includes('내 재료') || lower.includes('있는 재료')) {
      const items = Storage.get('yorijori_ingredients', []);
      if (!items.length) {
        return '냉장고에 아직 재료가 없어요 🧊\n냉장고 탭에서 재료를 추가해 주세요!';
      }
      const names = items.map(i => i.name || i).slice(0, 5).join(', ');
      const extra  = items.length > 5 ? ` 외 ${items.length - 5}개` : '';
      return `냉장고에 ${names}${extra} 있군요! 👀\n아래 "냉장고 파먹기" 섹션에서 맞춤 레시피를 확인해 보세요 👇`;
    }

    for (const rule of AI_RULES) {
      if (rule.keywords.some(k => lower.includes(k))) {
        return typeof rule.reply === 'function' ? rule.reply() : rule.reply;
      }
    }

    return '흠, 잘 모르겠어요 😅\n레시피 탐색 탭에서 직접 검색해 보시거나,\n냉장고 재료를 등록하면 맞춤 추천을 드릴 수 있어요!';
  }

  /* ---------- 레시피 카드 표시 ---------- */

  function appendRecipeCards(recipes) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;
    if (!recipes || recipes.length === 0) return;

    const msg = document.createElement('div');
    msg.className = 'chat-msg chat-ai';

    const avatar = document.createElement('span');
    avatar.className = 'chat-avatar';
    avatar.textContent = '🤖';
    msg.appendChild(avatar);

    const cards = document.createElement('div');
    cards.className = 'chat-recipe-cards';

    recipes.forEach(r => {
      let keys = [];
      try { keys = JSON.parse(r.key_ingredients || '[]'); } catch { keys = []; }

      const card = document.createElement('div');
      card.className = 'chat-recipe-card';
      card.innerHTML = `
        <div class="chat-recipe-name">${r.name}</div>
        <div class="chat-recipe-meta">⏱ ${r.cook_time_min}분 · ${r.difficulty}</div>
        ${keys.length ? `<div class="chat-recipe-ingredients">${keys.slice(0, 4).join(', ')}</div>` : ''}
      `;
      card.addEventListener('click', () => RecipeModal.open(r.id));
      cards.appendChild(card);
    });

    msg.appendChild(cards);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ---------- 채팅 메시지 추가 ---------- */

  function appendMessage(text, role) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    // 타이핑 인디케이터 제거
    document.getElementById('chat-typing')?.remove();

    const msg = document.createElement('div');
    msg.className = `chat-msg chat-${role}`;

    if (role === 'ai') {
      const avatar = document.createElement('span');
      avatar.className = 'chat-avatar';
      avatar.textContent = '🤖';
      msg.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    msg.appendChild(bubble);

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl || document.getElementById('chat-typing')) return;

    const msg = document.createElement('div');
    msg.id = 'chat-typing';
    msg.className = 'chat-msg chat-ai';

    const avatar = document.createElement('span');
    avatar.className = 'chat-avatar';
    avatar.textContent = '🤖';

    const dots = document.createElement('div');
    dots.className = 'chat-bubble typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    msg.append(avatar, dots);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ---------- 메시지 전송 처리 ---------- */

  function sendMessage() {
    const input   = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    input.value = '';
    sendBtn.disabled = true;

    appendMessage(text, 'user');
    showTyping();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
      .then(res => res.json())
      .then(data => {
        sendBtn.disabled = false;
        appendMessage(data.reply || '응답을 받지 못했어요.', 'ai');

        if (data.action) {
          if (data.action.type === 'FRIDGE_SAVE' && Array.isArray(data.action.items)) {
            data.action.items.forEach(item => {
              Fridge.add(item.name, item.category || '채소/과일', '', item.count || 1);
            });
            Fridge.render();
          } else if (data.action.type === 'RECIPE_SEARCH') {
            appendRecipeCards(data.action.recipes);
          }
        }

        input.focus();
      })
      .catch(() => {
        sendBtn.disabled = false;
        appendMessage('서버 연결에 실패했어요. 잠시 후 다시 시도해주세요.', 'ai');
        input.focus();
      });
  }

  /* ---------- 초기화 ---------- */

  function init() {

    const input   = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    sendBtn?.addEventListener('click', sendMessage);
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) sendMessage();
    });

    /* ── 액션 메뉴 (+ 버튼) ── */
    const attachBtn  = document.getElementById('chat-attach-btn');
    const actionMenu = document.getElementById('chat-action-menu');

    function openMenu() {
      actionMenu.classList.add('open');
      actionMenu.setAttribute('aria-hidden', 'false');
      attachBtn.classList.add('active');
    }
    function closeMenu() {
      actionMenu.classList.remove('open');
      actionMenu.setAttribute('aria-hidden', 'true');
      attachBtn.classList.remove('active');
    }

    attachBtn?.addEventListener('click', e => {
      e.stopPropagation();
      actionMenu.classList.contains('open') ? closeMenu() : openMenu();
    });

    // 메뉴 외부 클릭 시 닫기
    document.addEventListener('click', e => {
      if (!actionMenu?.contains(e.target)) closeMenu();
    });

    // 사진 업로드 (추후 구현)
    document.getElementById('action-photo')?.addEventListener('click', () => {
      closeMenu();
    });

    /* ── 마이크 버튼 (음성 인식) ── */
    const micBtn = document.getElementById('chat-mic-btn');
    const chatInput = document.getElementById('chat-input');
    let mediaRecorder = null;
    let audioChunks = [];

    micBtn?.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        micBtn.classList.add('recording');
        micBtn.setAttribute('aria-label', '녹음 중지');

        mediaRecorder.addEventListener('dataavailable', e => {
          if (e.data.size > 0) audioChunks.push(e.data);
        });

        mediaRecorder.addEventListener('stop', async () => {
          micBtn.classList.remove('recording');
          micBtn.setAttribute('aria-label', '음성 인식');
          stream.getTracks().forEach(t => t.stop());

          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          appendMessage('🎤 음성 인식 중...', 'ai');

          try {
            const response = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'audio/webm' },
              body: audioBlob
            });
            const data = await response.json();
            if (data.transcript) {
              document.getElementById('chat-typing')?.remove();
              const lastAi = document.querySelectorAll('.chat-msg.chat-ai');
              lastAi[lastAi.length - 1]?.remove();
              if (chatInput) chatInput.value = data.transcript;
            } else {
              appendMessage('음성을 인식하지 못했어요. 다시 시도해주세요.', 'ai');
            }
          } catch {
            appendMessage('음성 인식에 실패했어요. 다시 시도해주세요.', 'ai');
          }
        });

        mediaRecorder.start();
      } catch {
        appendMessage('마이크 접근 권한이 필요합니다.', 'ai');
      }
    });

    /* ── 재료 선택 칩 ── */
    const ingredientChipsEl = document.getElementById('ingredient-chips');
    let isIngredientSelectorOpen = false;

    const FALLBACK_INGREDIENTS = ['쌀', '돼지고기', '계란', '시우'];

    function openIngredientSelector() {
      // 냉장고 저장 데이터 또는 폴백 사용
      const stored = Storage.get('yorijori_ingredients', []);
      const names  = stored.length
        ? stored.map(i => i.name || i)
        : FALLBACK_INGREDIENTS;

      // 칩 렌더링
      ingredientChipsEl.innerHTML = '';

      const label = document.createElement('span');
      label.className = 'ingredient-chips-label';
      label.textContent = '재료 선택';
      ingredientChipsEl.appendChild(label);

      names.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'ingredient-chip';
        btn.textContent = name;
        btn.addEventListener('click', () => {
          input.value = `${name} 으로 만들 수 있는 요리 추천해줘`;
          closeIngredientSelector();
          sendMessage();
        });
        ingredientChipsEl.appendChild(btn);
      });

      ingredientChipsEl.classList.remove('hidden');
      ingredientChipsEl.setAttribute('aria-hidden', 'false');
      chips?.classList.add('hidden'); // quick-chips 숨기기
      isIngredientSelectorOpen = true;
    }

    function closeIngredientSelector() {
      ingredientChipsEl.classList.add('hidden');
      ingredientChipsEl.setAttribute('aria-hidden', 'true');
      chips?.classList.remove('hidden'); // quick-chips 복원
      isIngredientSelectorOpen = false;
    }

    document.getElementById('action-ingredients')?.addEventListener('click', () => {
      closeMenu();
      isIngredientSelectorOpen ? closeIngredientSelector() : openIngredientSelector();
    });

    /* 빠른 답장 칩 */
    const chips = document.getElementById('quick-chips');

    function hideChips() { chips?.classList.add('hidden'); }
    function showChips() { chips?.classList.remove('hidden'); }

    // 타이핑 시작 → 칩 페이드아웃 / 입력 비우면 → 재표시
    input?.addEventListener('input', () => {
      if (input.value.length > 0) {
        hideChips();
        if (isIngredientSelectorOpen) closeIngredientSelector();
      } else {
        showChips();
      }
    });

    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (!input) return;
        const chipText = chip.dataset.text;

        // 냉장고 재료 관리: 현재 냉장고 목록 보여주고 추가/수정 안내
        if (chipText.includes('냉장고 재료 관리')) {
          appendMessage(chipText, 'user');
          hideChips();
          const items = Storage.get('yorijori_ingredients', []);
          if (items.length === 0) {
            appendMessage(
              '냉장고가 비어있어요 🧊\n아래처럼 말씀해 주시면 재료를 바로 추가해 드릴게요!\n\n예) "오이 2개 넣어줘" / "당근이랑 계란 추가해줘"',
              'ai'
            );
          } else {
            const list = items.map(i => `• ${i.name || i}${i.count ? ' ' + i.count + '개' : ''}`).join('\n');
            appendMessage(
              `현재 냉장고 재료예요 🧊\n${list}\n\n재료를 추가하거나 수정하려면 말씀해 주세요!\n예) "당근 3개 추가해줘" / "우유 빼줘"`,
              'ai'
            );
          }
          showChips();
          return;
        }

        // 추천 레시피: 냉장고 재료 기반으로 API에 레시피 검색 요청
        if (chipText.includes('추천 레시피')) {
          const items = Storage.get('yorijori_ingredients', []);
          if (items.length === 0) {
            appendMessage(chipText, 'user');
            appendMessage(
              '냉장고에 재료가 없어요 🧊\n"냉장고 재료 관리"를 눌러 재료를 추가하거나 냉장고 탭에서 등록해 주세요!',
              'ai'
            );
            showChips();
            return;
          }
          const names = items.map(i => i.name || i).join(', ');
          input.value = `냉장고에 ${names} 있어. 이 재료로 만들 수 있는 레시피 추천해줘`;
          sendMessage();
          showChips();
          return;
        }

        // 인기 요리: SNS 트렌딩 레시피를 채팅창에 카드로 표시
        if (chipText.includes('인기 요리')) {
          appendMessage(chipText, 'user');
          hideChips();
          showTyping();
          fetch('/api/recipes/trending')
            .then(res => res.json())
            .then(recipes => {
              appendMessage('좋아요가 많은 인기 레시피예요 🔥', 'ai');
              const mapped = recipes.slice(0, 3).map(r => ({
                id:             r.id,
                name:           r.name,
                cook_time_min:  r.time,
                difficulty:     r.difficulty,
                key_ingredients: JSON.stringify(r.keyIngredients || []),
              }));
              appendRecipeCards(mapped);
              showChips();
            })
            .catch(() => {
              appendMessage('인기 레시피를 불러오지 못했어요. 잠시 후 다시 시도해주세요.', 'ai');
              showChips();
            });
          return;
        }

        // 기본: 그대로 전송
        input.value = chipText;
        sendMessage();
        showChips();
      });
    });
  }

  return { init };
})();


/* =========================================
   RecipeModal — 레시피 상세 모달
   ========================================= */
const RecipeModal = (() => {

  /* ---------- 모달 열기 ---------- */

  function open(recipeId) {
    const recipe  = RECIPES.find(r => r.id === recipeId);
    const overlay = document.getElementById('recipe-modal');
    const bodyEl  = document.getElementById('modal-body');
    if (!recipe || !overlay || !bodyEl) return;

    overlay.removeAttribute('hidden');
    requestAnimationFrame(() => overlay.classList.add('open'));

    if (recipe.source === 'db') {
      // DB 레시피: API에서 steps + reviews 가져온 뒤 렌더
      bodyEl.innerHTML = '<p style="padding:32px;text-align:center;color:var(--color-text-secondary)">불러오는 중…</p>';
      Api.fetchRecipe(recipeId).then(full => {
        // 캐시 갱신
        Object.assign(recipe, full);
        bodyEl.innerHTML = '';
        bodyEl.appendChild(buildContent(recipe));
      }).catch(() => {
        bodyEl.innerHTML = '';
        bodyEl.appendChild(buildContent(recipe));
      });
    } else {
      bodyEl.innerHTML = '';
      bodyEl.appendChild(buildContent(recipe));
    }
  }

  /* ---------- 모달 닫기 ---------- */

  function close() {
    const overlay = document.getElementById('recipe-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => {
      overlay.setAttribute('hidden', '');
    }, { once: true });
  }

  /* ---------- 콘텐츠 빌더 ---------- */

  function buildContent(recipe) {
    const frag = document.createDocumentFragment();

    /* 헤더: 이모지 + 이름 + 배지 + 재료 */
    const header = document.createElement('div');
    header.className = 'modal-recipe-header';

    const emojiEl = document.createElement('div');
    emojiEl.className = 'modal-recipe-emoji';
    setRecipeVisual(emojiEl, recipe);

    const info = document.createElement('div');
    info.className = 'modal-recipe-info';

    const nameRow = document.createElement('div');
    nameRow.className = 'modal-recipe-name-row';

    const nameEl = document.createElement('h2');
    nameEl.className = 'modal-recipe-name';
    nameEl.id = 'modal-recipe-name';
    nameEl.textContent = recipe.name;

    const headerRating = document.createElement('span');
    headerRating.className = 'modal-recipe-header-rating';
    headerRating.innerHTML = `<svg viewBox="0 0 24 24" class="rating-star rating-star--md"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>${(recipe.rating ?? 4.5).toFixed(1)}`;

    nameRow.append(nameEl, headerRating);

    const badgesEl = document.createElement('div');
    badgesEl.className = 'modal-recipe-badges';

    const timeBadge = document.createElement('span');
    timeBadge.className = 'badge badge-time';
    timeBadge.textContent = `⏱ ${recipe.time}분`;

    const diffBadge = document.createElement('span');
    diffBadge.className = 'badge badge-diff';
    diffBadge.textContent = recipe.difficulty;
    diffBadge.style.setProperty('--diff-color', DIFF_COLOR[recipe.difficulty] || '#888');

    badgesEl.append(timeBadge, diffBadge);

    const ingrEl = document.createElement('p');
    ingrEl.className = 'modal-recipe-ingr';
    ingrEl.textContent = recipe.ingredients.join(' · ');

    info.append(nameRow, badgesEl, ingrEl);
    header.append(emojiEl, info);
    frag.appendChild(header);

    /* 조리 과정 */
    frag.appendChild(makeDivider());

    const stepsSection = document.createElement('div');
    stepsSection.className = 'modal-section';

    const stepsTitle = document.createElement('h3');
    stepsTitle.className = 'modal-section-title';
    stepsTitle.textContent = '조리 과정';

    const ol = document.createElement('ol');
    ol.className = 'modal-steps-list';

    recipe.instructions.forEach(step => {
      const li = document.createElement('li');
      li.className = 'modal-step-item';
      li.textContent = step;
      ol.appendChild(li);
    });

    stepsSection.append(stepsTitle, ol);
    frag.appendChild(stepsSection);

    /* 유튜브 참고 */
    frag.appendChild(makeDivider());

    const ytSection = document.createElement('div');
    ytSection.className = 'modal-section';

    const ytTitle = document.createElement('h3');
    ytTitle.className = 'modal-section-title';
    ytTitle.textContent = '유튜브 참고';

    const ytScroll = document.createElement('div');
    ytScroll.className = 'modal-yt-scroll';

    // 로딩 스켈레톤 3개
    for (let i = 0; i < 3; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'modal-yt-card modal-yt-skeleton';
      skeleton.innerHTML = `
        <div class="modal-yt-thumb" style="background:#2a2a2a;"></div>
        <p class="modal-yt-title" style="background:#2a2a2a;color:transparent;border-radius:4px;">로딩 중...</p>
      `;
      ytScroll.appendChild(skeleton);
    }

    ytSection.append(ytTitle, ytScroll);
    frag.appendChild(ytSection);

    // YouTube API 비동기 로드
    fetch(`/api/youtube/search?q=${encodeURIComponent(recipe.name)}&recipeId=${recipe.id}`)
      .then(r => r.json())
      .then(videos => {
        ytScroll.innerHTML = '';
        if (!Array.isArray(videos) || videos.length === 0) {
          ytScroll.innerHTML = '<p style="color:#aaa;padding:12px;">관련 영상을 찾지 못했습니다.</p>';
          return;
        }
        videos.forEach(v => {
          const card = document.createElement('div');
          card.className = 'modal-yt-card';
          card.style.cursor = 'pointer';
          card.innerHTML = `
            <div class="modal-yt-thumb" style="background:#000;position:relative;overflow:hidden;">
              <img src="${v.thumbnail}" alt="${v.title}" style="width:100%;height:100%;object-fit:cover;display:block;">
            </div>
            <p class="modal-yt-title">${v.title}</p>
          `;
          card.addEventListener('click', () => window.open(v.url, '_blank'));
          ytScroll.appendChild(card);
        });
      })
      .catch(() => {
        ytScroll.innerHTML = '<p style="color:#aaa;padding:12px;">영상을 불러오지 못했습니다.</p>';
      });

    /* 리뷰 섹션 */
    // DB 레시피는 recipe.reviews 배열 사용, 로컬 레시피는 하드코딩 객체 사용
    const photoReviews = recipe.source === 'db' ? [] : (RECIPE_REVIEWS[recipe.id] || []);
    const textReviews  = recipe.source === 'db'
      ? (recipe.reviews || []).map(r => ({ ...r, date: r.date || '' }))
      : (RECIPE_TEXT_REVIEWS[recipe.id] || []);
    const totalReviews = photoReviews.length + textReviews.length;

    if (totalReviews > 0) {
      frag.appendChild(makeDivider());

      const reviewSection = document.createElement('div');
      reviewSection.className = 'modal-section';

      // 섹션 타이틀 행
      const reviewTitleRow = document.createElement('div');
      reviewTitleRow.className = 'modal-review-title-row';

      const reviewTitle = document.createElement('h3');
      reviewTitle.className = 'modal-section-title';
      reviewTitle.textContent = '리뷰';

      const reviewCount = document.createElement('span');
      reviewCount.className = 'modal-review-count';
      reviewCount.textContent = totalReviews;

      reviewTitleRow.append(reviewTitle, reviewCount);

      // ── 헬퍼: 별점 DOM ──────────────────────────────
      const starSVG = `<svg viewBox="0 0 24 24" class="review-star"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
      function buildStars(rating) {
        const wrap = document.createElement('div');
        wrap.className = 'modal-review-stars';
        for (let i = 0; i < 5; i++) {
          const s = document.createElement('span');
          s.className = `review-star-wrap${i < rating ? ' filled' : ''}`;
          s.innerHTML = starSVG;
          wrap.appendChild(s);
        }
        return wrap;
      }

      // ── 헬퍼: 포토 리뷰 아이템 ───────────────────────
      function buildPhotoItem(rv) {
        const item = document.createElement('div');
        item.className = 'modal-review-item';

        const content = document.createElement('div');
        content.className = 'modal-review-content';

        const reviewHeader = document.createElement('div');
        reviewHeader.className = 'modal-review-header';

        const userName = document.createElement('span');
        userName.className = 'modal-review-user';
        userName.textContent = rv.user;

        reviewHeader.append(userName, buildStars(rv.rating));

        const reviewText = document.createElement('p');
        reviewText.className = 'modal-review-text';
        reviewText.textContent = rv.text;

        content.append(reviewHeader, reviewText);

        const photo = document.createElement('div');
        photo.className = 'modal-review-photo';
        photo.style.background = rv.grad;
        photo.textContent = rv.photo;

        item.append(content, photo);
        return item;
      }

      // ── 헬퍼: 텍스트 리뷰 아이템 ─────────────────────
      function buildTextItem(rv) {
        const item = document.createElement('div');
        item.className = 'modal-text-review-item';

        const meta = document.createElement('div');
        meta.className = 'modal-text-review-meta';

        const userName = document.createElement('span');
        userName.className = 'modal-review-user';
        userName.textContent = rv.user;

        const rightMeta = document.createElement('div');
        rightMeta.className = 'modal-text-review-right-meta';
        rightMeta.append(buildStars(rv.rating));

        if (rv.date) {
          const date = document.createElement('span');
          date.className = 'modal-text-review-date';
          date.textContent = rv.date;
          rightMeta.appendChild(date);
        }

        meta.append(userName, rightMeta);

        const reviewText = document.createElement('p');
        reviewText.className = 'modal-review-text';
        reviewText.textContent = rv.text;

        item.append(meta, reviewText);
        return item;
      }

      // ── 포토 모아보기 갤러리 ─────────────────────────
      const GALLERY_MAX = 5;
      const galleryWrap = document.createElement('div');
      galleryWrap.className = 'modal-photo-gallery';

      photoReviews.forEach((rv, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'modal-photo-thumb';
        thumb.style.background = rv.grad;

        // 초과분: 마지막 슬롯에 +N 오버레이
        if (idx === GALLERY_MAX - 1 && photoReviews.length > GALLERY_MAX) {
          const over = document.createElement('div');
          over.className = 'modal-photo-thumb-more';
          over.textContent = `+${photoReviews.length - (GALLERY_MAX - 1)}`;
          thumb.appendChild(over);
        } else {
          thumb.textContent = rv.photo;
        }

        // 라이트박스 열기 (전체 목록 + 현재 인덱스)
        thumb.addEventListener('click', () => PhotoLightbox.open(photoReviews, idx));

        galleryWrap.appendChild(thumb);
        if (idx >= GALLERY_MAX - 1 && photoReviews.length > GALLERY_MAX) return;
      });

      // ── 초기 렌더 (포토 2 + 텍스트 2) ────────────────
      const INIT = 2;
      const photoList = document.createElement('div');
      photoList.className = 'modal-review-list';
      photoReviews.slice(0, INIT).forEach(rv => photoList.appendChild(buildPhotoItem(rv)));

      const textList = document.createElement('div');
      textList.className = 'modal-text-review-list';
      textReviews.slice(0, INIT).forEach(rv => textList.appendChild(buildTextItem(rv)));

      // ── 더보기 버튼 ───────────────────────────────────
      const hiddenCount = (photoReviews.length - Math.min(INIT, photoReviews.length))
                        + (textReviews.length  - Math.min(INIT, textReviews.length));

      reviewSection.append(reviewTitleRow, galleryWrap, photoList, textList);

      if (hiddenCount > 0) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'modal-review-more-btn';
        moreBtn.textContent = `리뷰 더보기 (${hiddenCount}개)`;
        moreBtn.addEventListener('click', () => {
          photoReviews.slice(INIT).forEach(rv => {
            const el = buildPhotoItem(rv);
            el.classList.add('review-item--fadein');
            photoList.appendChild(el);
          });
          textReviews.slice(INIT).forEach(rv => {
            const el = buildTextItem(rv);
            el.classList.add('review-item--fadein');
            textList.appendChild(el);
          });
          moreBtn.remove();
        });
        reviewSection.appendChild(moreBtn);
      }

      frag.appendChild(reviewSection);
    }

    // 하단 여백 (네비바 가림 방지)
    const spacer = document.createElement('div');
    spacer.style.height = '28px';
    frag.appendChild(spacer);

    return frag;
  }

  function makeDivider() {
    const div = document.createElement('div');
    div.className = 'modal-divider';
    return div;
  }

  /* ---------- 초기화 ---------- */

  function init() {
    const overlay  = document.getElementById('recipe-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    if (!overlay) return;

    closeBtn?.addEventListener('click', close);

    // 배경(오버레이) 클릭 시 닫기
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    // Escape 키로 닫기
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
  }

  return { init, open };
})();


/* =========================================
   PhotoLightbox — 리뷰 사진 확대 오버레이
   ========================================= */
const PhotoLightbox = (() => {
  let photos  = [];   // 현재 레시피의 포토 리뷰 배열
  let current = 0;    // 현재 인덱스

  // ── DOM 참조 (init 후 유효) ──────────────────────────
  let lb, photoEl, metaEl, textEl, indicatorsEl, prevBtn, nextBtn;

  // ── 콘텐츠 렌더 ──────────────────────────────────────
  function render(idx, animate = false) {
    const rv = photos[idx];
    if (!rv) return;

    if (animate) {
      photoEl.classList.remove('lb-slide');
      void photoEl.offsetWidth;          // reflow → 애니메이션 재시작
      photoEl.classList.add('lb-slide');
    }

    photoEl.style.background = rv.grad;
    photoEl.textContent       = rv.photo;

    // 별점
    const filled   = `fill:#f59e0b`;
    const unfilled = `fill:rgba(255,255,255,0.28)`;
    const starBase = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

    metaEl.innerHTML = '';
    const userSpan = document.createElement('span');
    userSpan.className   = 'photo-lightbox-user';
    userSpan.textContent = rv.user;

    const starsWrap = document.createElement('div');
    starsWrap.className = 'photo-lightbox-stars';
    for (let i = 0; i < 5; i++) {
      starsWrap.innerHTML += `<span style="display:inline-flex;${i < rv.rating ? filled : unfilled}">${starBase}</span>`;
    }
    metaEl.append(userSpan, starsWrap);

    textEl.textContent = rv.text;

    // 인디케이터 점
    [...indicatorsEl.children].forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
    });

    // 화살표 표시/숨김
    prevBtn.hidden = idx === 0;
    nextBtn.hidden = idx === photos.length - 1;
  }

  // ── 열기 ─────────────────────────────────────────────
  function open(rvList, startIdx = 0) {
    // 단일 리뷰 객체로 호출될 경우를 배열로 통일
    photos  = Array.isArray(rvList) ? rvList : [rvList];
    current = startIdx;

    // 인디케이터 재구성
    indicatorsEl.innerHTML = '';
    if (photos.length > 1) {
      photos.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'lb-dot';
        dot.addEventListener('click', () => { current = i; render(current, true); });
        indicatorsEl.appendChild(dot);
      });
    }

    render(current);
    lb.removeAttribute('hidden');
    requestAnimationFrame(() => lb.classList.add('open'));
  }

  // ── 닫기 ─────────────────────────────────────────────
  function close() {
    lb.classList.remove('open');
    lb.addEventListener('transitionend', () => lb.setAttribute('hidden', ''), { once: true });
  }

  // ── 초기화 ───────────────────────────────────────────
  function init() {
    lb           = document.getElementById('photo-lightbox');
    photoEl      = document.getElementById('photo-lightbox-photo');
    metaEl       = document.getElementById('photo-lightbox-meta');
    textEl       = document.getElementById('photo-lightbox-text');
    indicatorsEl = document.getElementById('photo-lightbox-indicators');
    prevBtn      = document.getElementById('photo-lightbox-prev');
    nextBtn      = document.getElementById('photo-lightbox-next');
    if (!lb) return;

    document.getElementById('photo-lightbox-close')
      ?.addEventListener('click', close);

    prevBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (current > 0) { current--; render(current, true); }
    });

    nextBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (current < photos.length - 1) { current++; render(current, true); }
    });

    lb.addEventListener('click', e => { if (e.target === lb) close(); });

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft'  && current > 0)                   { current--; render(current, true); }
      if (e.key === 'ArrowRight' && current < photos.length - 1)   { current++; render(current, true); }
    });
  }

  return { init, open };
})();

/* =========================================
   Category Chips (홈 화면) — 토글 선택
   ========================================= */
function initChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
}


/* =========================================
   Settings — 설정 모달
   ========================================= */
const Settings = (() => {

  const FONT_MAP = {
    system:      '',
    nanumgothic: "'Nanum Gothic', sans-serif",
    notoserifkr: "'Noto Serif KR', serif",
  };

  const SIZE_MAP = {
    small:  '13px',
    medium: '15px',
    large:  '17px',
  };

  let current = {
    font:      Storage.get('yrj_font',       'system'),
    fontSize:  Storage.get('yrj_font_size',  'medium'),
    showChips: Storage.get('yrj_show_chips', true),
  };

  const LOGIN_KEY = 'yrj_logged_in';
  const USER_KEY  = 'yrj_user';

  const GOOGLE_CLIENT_ID = '412792507622-0e2psgrf1tusb2fdbfv4cqfg5us0fabp.apps.googleusercontent.com';

  /** 로그인 상태 — localStorage에서 복원 */
  let isLoggedIn = Storage.get(LOGIN_KEY, false);
  let currentUser = Storage.get(USER_KEY, null);

  function renderLoginSection() {
    const loginBtn  = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('google-logout-btn');
    if (loginBtn)  loginBtn.hidden  = isLoggedIn;
    if (logoutBtn) logoutBtn.hidden = !isLoggedIn;

    // 유저 정보 표시
    const userInfo = document.getElementById('google-user-info');
    if (userInfo) {
      if (isLoggedIn && currentUser) {
        userInfo.hidden = false;
        userInfo.innerHTML = `
          <img src="${currentUser.picture}" alt="프로필" style="width:32px;height:32px;border-radius:50%;vertical-align:middle;margin-right:8px;">
          <span style="font-size:14px;">${currentUser.name}</span>
        `;
      } else {
        userInfo.hidden = true;
        userInfo.innerHTML = '';
      }
    }

    // 배너: hidden 속성 대신 CSS 클래스로 트랜지션 처리
    const banner = document.getElementById('login-prompt-banner');
    if (banner) banner.classList.toggle('is-hidden', isLoggedIn);
  }

  /** 버튼에 pop 애니메이션을 재생한 뒤 콜백 실행 */
  function animatePress(btnId, cb) {
    const btn = document.getElementById(btnId);
    if (!btn) { cb(); return; }
    btn.classList.remove('pressing');
    void btn.offsetWidth;
    btn.classList.add('pressing');
    btn.addEventListener('animationend', () => {
      btn.classList.remove('pressing');
      cb();
    }, { once: true });
  }

  function handleGoogleCredential(response) {
    fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential }),
    })
      .then(r => r.json())
      .then(data => {
        console.log('[google login] 응답:', data);
        if (!data || data.error || data.message) {
          alert('로그인 실패: ' + (data?.message || data?.error || '알 수 없는 오류'));
          return;
        }
        const user = data.user || data;
        if (!user.name && user.nickname) user.name = user.nickname;
        isLoggedIn  = true;
        currentUser = user;
        Storage.set(LOGIN_KEY, true);
        Storage.set(USER_KEY, user);
        if (data.token) Storage.set('yrj_token', data.token);
        renderLoginSection();
        alert('✓ ' + (user.name || user.email) + '으로 로그인됐어요');
      })
      .catch(err => {
        console.error('[google login]', err);
        alert('로그인 중 오류가 발생했어요');
      });
  }

  function initGoogleLogin() {
    // GSI 스크립트 로드 대기 후 숨겨진 버튼 렌더링
    function setup() {
      if (!window.google) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback:  handleGoogleCredential,
      });

      // 숨겨진 div에 Google 공식 버튼 렌더링
      const hiddenDiv = document.createElement('div');
      hiddenDiv.id = 'google-hidden-btn';
      hiddenDiv.style.cssText = 'position:absolute;opacity:0;pointer-events:none;';
      document.body.appendChild(hiddenDiv);

      google.accounts.id.renderButton(hiddenDiv, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
      });
    }

    if (window.google) {
      setup();
    } else {
      // async 로드 완료 대기
      const interval = setInterval(() => {
        if (window.google) { clearInterval(interval); setup(); }
      }, 100);
    }
  }

  function googleLogin() {
    animatePress('google-login-btn', () => {
      const hiddenBtn = document.querySelector('#google-hidden-btn div[role="button"]');
      if (hiddenBtn) {
        hiddenBtn.click();
      } else {
        console.warn('[google login] 버튼 아직 미준비');
      }
    });
  }

  function googleLogout() {
    animatePress('google-logout-btn', () => {
      if (window.google) google.accounts.id.disableAutoSelect();
      isLoggedIn  = false;
      currentUser = null;
      Storage.set(LOGIN_KEY, false);
      Storage.set(USER_KEY, null);
      renderLoginSection();
    });
  }

  function applyFont(val) {
    document.documentElement.style.setProperty('--app-font', FONT_MAP[val] || '');
  }

  function applyFontSize(val) {
    document.documentElement.style.setProperty('--app-font-size', SIZE_MAP[val] || SIZE_MAP.medium);
  }

  function applyChips(val) {
    const chips = document.getElementById('quick-chips');
    if (chips) chips.classList.toggle('hidden', !val);
  }

  function applyAll() {
    applyFont(current.font);
    applyFontSize(current.fontSize);
    applyChips(current.showChips);
  }

  function syncUI() {
    const overlay = document.getElementById('settings-modal');
    if (!overlay) return;

    // 폰트 라디오
    const radio = overlay.querySelector(`input[name="font"][value="${current.font}"]`);
    if (radio) radio.checked = true;

    // 글자 크기 세그먼트
    overlay.querySelectorAll('.settings-segment-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === current.fontSize);
    });

    // 칩 토글
    const toggle = document.getElementById('chips-toggle');
    if (toggle) toggle.checked = current.showChips;

    // 로그인 섹션
    renderLoginSection();
  }

  function openModal() {
    const overlay = document.getElementById('settings-modal');
    if (!overlay) return;
    syncUI();
    overlay.removeAttribute('hidden');
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  function closeModal() {
    const overlay = document.getElementById('settings-modal');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => overlay.setAttribute('hidden', ''), { once: true });
  }

  function init() {
    applyAll();
    // 페이지 로드 시 localStorage 상태를 배너·버튼에 즉시 반영
    renderLoginSection();

    document.querySelector('.header-settings-btn')?.addEventListener('click', openModal);
    document.getElementById('settings-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('settings-modal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });

    // 폰트 선택
    document.querySelectorAll('input[name="font"]').forEach(radio => {
      radio.addEventListener('change', () => {
        current.font = radio.value;
        Storage.set('yrj_font', current.font);
        applyFont(current.font);
      });
    });

    // 글자 크기
    document.querySelectorAll('.settings-segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        current.fontSize = btn.dataset.size;
        Storage.set('yrj_font_size', current.fontSize);
        applyFontSize(current.fontSize);
        document.querySelectorAll('.settings-segment-btn').forEach(b =>
          b.classList.toggle('active', b === btn)
        );
      });
    });

    // 로그인 / 로그아웃
    initGoogleLogin();
    document.getElementById('google-login-btn')?.addEventListener('click', googleLogin);
    document.getElementById('google-logout-btn')?.addEventListener('click', googleLogout);

    // 로그인 유도 배너 — 클릭 시 설정 열기
    document.getElementById('login-prompt-banner')?.addEventListener('click', openModal);

    // 닫기 버튼 — 설정 열기 막고 배너만 접기
    document.getElementById('login-prompt-close')?.addEventListener('click', e => {
      e.stopPropagation();
      const banner = document.getElementById('login-prompt-banner');
      if (banner) banner.classList.add('is-hidden');
    });

    // 추천 문구 토글
    document.getElementById('chips-toggle')?.addEventListener('change', e => {
      current.showChips = e.target.checked;
      Storage.set('yrj_show_chips', current.showChips);
      applyChips(current.showChips);
    });

    // Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('settings-modal');
        if (overlay?.classList.contains('open')) closeModal();
      }
    });
  }

  return { init };
})();


/* =========================================
   Boot
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
  Home.init();
  Fridge.init();
  Explore.init();
  RecipeModal.init();
  PhotoLightbox.init();
  Settings.init();
  initChips();

  // DB 레시피 비동기 로드 → 완료 후 탐색 탭 재렌더 + 트렌딩 로드
  Api.loadRecipes().then(() => {
    Explore.render();
    Explore.loadTrending();
  });

  // 냉장고 레시피 검색 버튼 클릭
  document.getElementById('fridge-recipe-search-btn')
    ?.addEventListener('click', () => {
      const names = Fridge.getSelectedNames();
      if (names.length === 0) return;
      Explore.filterByIngredients(names);
      Router.navigateTo('explore');
    });

  // 재료 필터 해제 버튼
  document.getElementById('fridge-filter-clear-btn')
    ?.addEventListener('click', () => {
      Explore.clearFridgeFilter();
    });

  // 페이지 전환 시 냉장고 레시피 검색 버튼을 냉장고 탭에서만 표시
  const _origNavigateTo = Router.navigateTo.bind(Router);
  Router.navigateTo = function(pageId) {
    _origNavigateTo(pageId);
    const btn = document.getElementById('fridge-recipe-search-btn');
    if (!btn) return;
    if (pageId !== 'fridge') {
      btn.hidden = true;
    } else {
      Fridge.updateRecipeSearchBtn();
    }
  };
});
