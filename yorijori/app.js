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
   Router — SPA 탭 네비게이션
   ========================================= */
const Router = (() => {
  const pages    = document.querySelectorAll('.page');
  const navItems = document.querySelectorAll('.nav-item');

  let currentPage = null;

  /**
   * pageId('home' | 'fridge' | 'explore')에 해당하는 페이지로 전환.
   * CSS transition(opacity + translateY)만 사용 — 깜빡임 없음.
   */
  function navigateTo(pageId) {
    if (pageId === currentPage) return;

    pages.forEach(p => p.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    const targetNav  = document.querySelector(`.nav-item[data-page="${pageId}"]`);

    if (!targetPage || !targetNav) {
      console.warn(`[Router] 알 수 없는 페이지: "${pageId}"`);
      return;
    }

    targetPage.classList.add('active');
    targetNav.classList.add('active');
    targetPage.scrollTop = 0;
    currentPage = pageId;

    // localStorage에 저장 — 브라우저를 닫았다 열어도 마지막 탭 유지
    Storage.set('yorijori_tab', pageId);

    // 홈으로 돌아올 때 냉장고 추천 갱신 (재료가 바뀌었을 수 있으므로)
    if (pageId === 'home' && typeof Home !== 'undefined') {
      Home.refreshFridgeRecos();
    }
  }

  function init() {
    navItems.forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });

    const VALID_PAGES = new Set(['home', 'fridge', 'explore']);
    const saved = Storage.get('yorijori_tab', 'home');
    navigateTo(VALID_PAGES.has(saved) ? saved : 'home');
  }

  return { init, navigateTo };
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
    save();
    render();
  }

  /* ---------- 렌더링 ---------- */

  function buildIngredientItem(item) {
    const li = document.createElement('li');
    li.className = 'ingredient-item';

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

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.setAttribute('aria-label', `${item.name} 삭제`);
    removeBtn.addEventListener('click', () => remove(item.id));

    li.append(photo, body, countBadge, removeBtn);
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

  /* ---------- 모달 ---------- */

  function openModal() {
    const modal = document.getElementById('add-ingr-modal');
    if (!modal) return;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.getElementById('modal-ingr-input')?.focus();
  }

  function closeModal() {
    const modal = document.getElementById('add-ingr-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.addEventListener('transitionend', () => { modal.hidden = true; }, { once: true });
    // 폼 초기화
    const inp = document.getElementById('modal-ingr-input');
    const exp = document.getElementById('modal-expiry-input');
    const cnt = document.getElementById('modal-count-display');
    if (inp) inp.value = '';
    if (exp) exp.value = '';
    if (cnt) cnt.textContent = '1';
  }

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

    /* 모달 열기 버튼 */
    document.getElementById('open-add-ingr-btn')
      ?.addEventListener('click', openModal);

    /* 모달 닫기 */
    document.getElementById('add-ingr-close-btn')
      ?.addEventListener('click', closeModal);
    document.getElementById('add-ingr-modal')
      ?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    /* 자동완성 — 모달 재료명 입력창 */
    const modalInput = document.getElementById('modal-ingr-input');
    if (modalInput) initAutocomplete(modalInput);

    /* 유통기한 단축 버튼 (모달 내) */
    const expiryInput = document.getElementById('modal-expiry-input');
    document.querySelectorAll('#add-ingr-modal .expiry-shortcut-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!expiryInput) return;
        const days = parseInt(btn.dataset.days, 10);
        const base = expiryInput.value ? new Date(expiryInput.value) : new Date();
        base.setDate(base.getDate() + days);
        const yyyy = base.getFullYear();
        const mm   = String(base.getMonth() + 1).padStart(2, '0');
        const dd   = String(base.getDate()).padStart(2, '0');
        expiryInput.value = `${yyyy}-${mm}-${dd}`;
      });
    });

    /* 갯수 +/- */
    let currentCount = 1;
    const countDisplay = document.getElementById('modal-count-display');
    document.getElementById('modal-count-minus')?.addEventListener('click', () => {
      if (currentCount > 1) { currentCount--; if (countDisplay) countDisplay.textContent = currentCount; }
    });
    document.getElementById('modal-count-plus')?.addEventListener('click', () => {
      currentCount++;
      if (countDisplay) countDisplay.textContent = currentCount;
    });

    /* 등록 버튼 */
    function handleModalAdd() {
      const name     = document.getElementById('modal-ingr-input')?.value || '';
      const category = document.getElementById('modal-category-select')?.value || '일반';
      const expiry   = document.getElementById('modal-expiry-input')?.value || '';
      const ok = add(name, category, expiry, currentCount);
      if (ok) {
        currentCount = 1;
        closeModal();
      }
    }

    document.getElementById('modal-ingr-add-btn')?.addEventListener('click', handleModalAdd);
    modalInput?.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      if (suppressNextAdd) { suppressNextAdd = false; return; }
      handleModalAdd();
    });
  }

  return { init };
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
   레시피 더미 데이터
   ========================================= */
const RECIPES = [
  {
    id: 1,
    emoji: '🍙',
    name: '참치마요 주먹밥',
    category: '간편식',
    ingredients: ['참치캔', '마요네즈', '밥', '김', '소금', '참기름'],
    keyIngredients: ['참치캔', '밥'],
    time: 10,
    difficulty: '쉬움',
    instructions: [
      '참치캔의 기름을 체에 밭쳐 충분히 빼요.',
      '그릇에 참치, 마요네즈, 소금을 넣고 잘 섞어요.',
      '손에 물을 적당히 묻히고 밥을 손바닥에 펴요.',
      '중앙에 참치마요를 넣고 꼭꼭 쥐어 주먹밥 모양을 만들어요.',
      '김으로 감싸고 참기름을 한 방울 떨어뜨리면 완성!',
    ],
    youtube_title: '참치마요 주먹밥 만들기 | 초간단 10분 레시피',
  },
  {
    id: 2,
    emoji: '🍜',
    name: '편의점 라면 나베',
    category: '편의점 꿀조합',
    ingredients: ['컵라면', '두부', '계란', '대파', '어묵'],
    keyIngredients: ['컵라면', '두부'],
    time: 15,
    difficulty: '쉬움',
    instructions: [
      '냄비에 물 500ml를 넣고 센 불로 끓여요.',
      '어묵과 두부를 한 입 크기로 잘라 넣어요.',
      '컵라면 면과 스프를 냄비에 넣고 3분 끓여요.',
      '대파를 어슷 썰어 넣고 계란을 깨뜨려 반숙으로 익혀요.',
      '뚝배기에 담으면 더욱 분위기 있는 나베 완성!',
    ],
    youtube_title: '편의점 라면 나베 | 간단하지만 진짜 맛있는 혼밥 레시피',
  },
  {
    id: 3,
    emoji: '🍳',
    name: '냉장고 털이 볶음밥',
    category: '한식',
    ingredients: ['찬밥', '계란', '냉동 채소', '간장', '참기름', '마늘'],
    keyIngredients: ['찬밥', '계란'],
    time: 15,
    difficulty: '쉬움',
    instructions: [
      '팬을 센 불로 달구고 기름을 두른 뒤 다진 마늘을 볶아요.',
      '냉동 채소를 넣고 수분이 날아갈 때까지 2분 볶아요.',
      '찬밥을 넣고 주걱으로 꾹꾹 눌러 가며 덩어리를 풀어요.',
      '팬 가장자리에 간장을 두르고 빠르게 섞어요.',
      '한쪽으로 볶음밥을 밀고 계란을 스크램블해 섞어요.',
      '불을 끄고 참기름을 한 방울 두르면 완성!',
    ],
    youtube_title: '냉장고 털이 볶음밥 | 자투리 재료로 만드는 황금 볶음밥',
  },
  {
    id: 4,
    emoji: '🥚',
    name: '고추참치 계란말이',
    category: '한식',
    ingredients: ['고추참치캔', '계란', '쪽파', '소금', '식용유'],
    keyIngredients: ['고추참치캔', '계란'],
    time: 15,
    difficulty: '보통',
    instructions: [
      '계란 3개를 그릇에 깨고 소금 한 꼬집을 넣어 잘 풀어요.',
      '고추참치캔 기름을 빼고 쪽파를 잘게 썰어 계란물에 섞어요.',
      '팬에 기름을 얇게 두르고 약불로 달구어요.',
      '계란물의 절반을 붓고 표면이 반 정도 익으면 앞쪽으로 말아요.',
      '나머지 계란물을 부어 같은 방법으로 말아서 통통한 롤을 만들어요.',
      '한 김 식힌 후 먹기 좋게 썰면 완성!',
    ],
    youtube_title: '고추참치 계란말이 | 초보도 쉬운 밥도둑 반찬',
  },
  {
    id: 5,
    emoji: '🍱',
    name: '떡볶이 치즈 덮밥',
    category: '편의점 꿀조합',
    ingredients: ['냉동 떡볶이', '밥', '슬라이스 치즈', '마요네즈'],
    keyIngredients: ['냉동 떡볶이', '밥'],
    time: 10,
    difficulty: '쉬움',
    instructions: [
      '냉동 떡볶이를 전자레인지 4분 또는 팬에 물 조금 넣어 데워요.',
      '따뜻한 밥을 그릇에 담고 떡볶이를 듬뿍 올려요.',
      '슬라이스 치즈를 올리고 전자레인지에 30초 돌려 치즈를 녹여요.',
      '마요네즈를 지그재그로 뿌리면 완성!',
    ],
    youtube_title: '떡볶이 치즈 덮밥 | 5분 완성 초간편 한 끼',
  },
  {
    id: 6,
    emoji: '🥩',
    name: '스팸 마늘종 볶음',
    category: '한식',
    ingredients: ['스팸', '마늘종', '고추장', '간장', '올리고당', '참기름'],
    keyIngredients: ['스팸', '마늘종'],
    time: 20,
    difficulty: '보통',
    instructions: [
      '스팸을 한 입 크기 직육면체로 잘라요.',
      '마늘종을 3~4cm 길이로 잘라요.',
      '팬에 기름을 두르지 않고 스팸을 노릇하게 구워 꺼내요.',
      '같은 팬에 마늘종을 볶다가 스팸을 다시 넣어요.',
      '고추장, 간장, 올리고당(1:1:1)을 섞어 소스를 만들어 넣고 볶아요.',
      '불을 끄고 참기름 한 방울로 마무리하면 완성!',
    ],
    youtube_title: '스팸 마늘종 볶음 | 밥 세 공기 각오하세요',
  },
  {
    id: 7,
    emoji: '🥬',
    name: '두부 간장 조림',
    category: '다이어트',
    ingredients: ['두부', '간장', '설탕', '참기름', '대파', '고춧가루'],
    keyIngredients: ['두부', '간장'],
    time: 20,
    difficulty: '쉬움',
    instructions: [
      '두부를 1.5cm 두께로 썰고 키친타월로 물기를 제거해요.',
      '팬에 기름을 두르고 중불에서 두부를 앞뒤로 노릇하게 구워요.',
      '간장 3 : 설탕 1 : 물 3 비율로 양념을 만들어요.',
      '구운 두부에 양념을 붓고 조려요.',
      '국물이 반으로 줄면 대파와 고춧가루를 뿌려요.',
      '참기름 한 방울로 마무리하면 완성!',
    ],
    youtube_title: '두부 간장 조림 | 건강하고 맛있는 기본 반찬',
  },
  {
    id: 8,
    emoji: '🥞',
    name: '김치 치즈 부침개',
    category: '한식',
    ingredients: ['묵은 김치', '슬라이스 치즈', '부침가루', '계란', '식용유'],
    keyIngredients: ['묵은 김치', '부침가루'],
    time: 20,
    difficulty: '보통',
    instructions: [
      '묵은 김치를 잘게 다지고 국물은 꼭 짜요.',
      '계란 1개, 부침가루 4큰술, 물 3큰술을 넣고 반죽해요.',
      '반죽에 다진 김치를 넣어 섞어요.',
      '팬에 기름을 두르고 반죽을 동그랗게 펴서 앞면을 구워요.',
      '뒤집은 후 슬라이스 치즈를 올리고 뚜껑을 덮어 치즈를 녹여요.',
      '노릇하게 익으면 접시에 담아 완성!',
    ],
    youtube_title: '김치 치즈 부침개 | 바삭하고 쫄깃한 황금 레시피',
  },
  {
    id: 9,
    emoji: '🥔',
    name: '감자 베이컨 볶음',
    category: '양식',
    ingredients: ['감자', '베이컨', '양파', '버터', '소금', '후추'],
    keyIngredients: ['감자', '베이컨'],
    time: 25,
    difficulty: '보통',
    instructions: [
      '감자 껍질을 벗기고 얇게 슬라이스하거나 채 썰어요.',
      '양파는 얇게 채 썰고, 베이컨은 2cm 폭으로 잘라요.',
      '팬에 버터를 녹이고 감자를 중불에서 볶아요.',
      '감자가 반 정도 익으면 베이컨과 양파를 넣어요.',
      '소금, 후추로 간하고 감자가 완전히 익을 때까지 볶아요.',
      '기호에 따라 파슬리를 뿌리면 서양식 감자 볶음 완성!',
    ],
    youtube_title: '감자 베이컨 볶음 | 집에서 만드는 브런치 레시피',
  },
  {
    id: 10,
    emoji: '🍵',
    name: '삼각김밥 된장국',
    category: '간편식',
    ingredients: ['참치 삼각김밥', '된장', '두부', '대파', '멸치다시마'],
    keyIngredients: ['참치 삼각김밥', '된장'],
    time: 10,
    difficulty: '쉬움',
    instructions: [
      '냄비에 물 400ml와 멸치다시마를 넣고 5분 끓여 육수를 내요.',
      '다시마와 멸치를 건져내고 두부를 깍둑 썰어 넣어요.',
      '된장 1.5큰술을 체에 풀어 넣고 중불로 끓여요.',
      '대파를 어슷 썰어 넣고 한 번 더 끓이면 된장국 완성.',
      '삼각김밥을 그릇에 담고 된장국과 함께 먹으면 든든한 한 끼!',
    ],
    youtube_title: '삼각김밥 된장국 | 5분 만에 만드는 따뜻한 한 끼',
  },
];


/* =========================================
   Explore — 레시피 탐색 & 즐겨찾기
   ========================================= */
const Explore = (() => {
  const FAV_KEY = 'yorijori_favorites';

  // 숫자 타입만 허용하여 타입 불일치 방지
  const rawFavs = Storage.get(FAV_KEY, []);
  let favorites      = new Set(Array.isArray(rawFavs) ? rawFavs.filter(Number.isFinite) : []);
  let showFavOnly    = false;
  let query          = '';
  let activeCategory = '전체';

  /* RECIPES에 있는 카테고리 목록 (삽입 순서 유지, 중복 제거) */
  const CATEGORIES_LIST = ['전체', ...new Set(RECIPES.map(r => r.category).filter(Boolean))];

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
    return RECIPES.filter(r => {
      const matchSearch = !q
        || r.name.toLowerCase().includes(q)
        || r.ingredients.some(i => i.toLowerCase().includes(q));
      const matchFav = !showFavOnly || favorites.has(r.id);
      const matchCat = activeCategory === '전체' || r.category === activeCategory;
      return matchSearch && matchFav && matchCat;
    });
  }

  /* ---------- 카테고리 칩 렌더링 ---------- */

  function renderCategoryChips() {
    const bar = document.getElementById('category-chips-bar');
    if (!bar) return;
    bar.innerHTML = '';
    CATEGORIES_LIST.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `category-chip${cat === activeCategory ? ' active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(cat === activeCategory));
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        if (activeCategory === cat) return;
        activeCategory = cat;
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
    thumb.textContent = recipe.emoji;

    const body = document.createElement('div');
    body.className = 'explore-card-body';

    const nameEl = document.createElement('h3');
    nameEl.className = 'explore-card-name';
    nameEl.textContent = recipe.name;

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
    body.append(nameEl, ingrEl, badges);
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

    // 카드 클릭 → 상세 모달 (하트 버튼은 stopPropagation으로 제외됨)
    article.addEventListener('click', () => RecipeModal.open(recipe.id));

    article.append(main, heartBtn);
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

    if (filtered.length === 0) {
      list.appendChild(showFavOnly
        ? createEmptyState('🤍', '즐겨찾기한 레시피가 없어요', '레시피의 ♡ 버튼을 눌러\n추가해 보세요!')
        : createEmptyState('🔍', '검색 결과가 없어요', '다른 키워드로 검색해 보세요')
      );
      return;
    }

    filtered.forEach(r => list.appendChild(buildCard(r)));
  }

  /* ---------- 초기화 ---------- */

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function init() {
    renderCategoryChips();
    render();

    const searchInput  = document.getElementById('search-input');
    const favToggleBtn = document.getElementById('fav-toggle-btn');

    if (searchInput) {
      searchInput.addEventListener('input', debounce(e => {
        query = e.target.value.trim();
        render();
      }, 180));
    }

    if (favToggleBtn) {
      favToggleBtn.addEventListener('click', () => {
        showFavOnly = !showFavOnly;
        favToggleBtn.classList.toggle('active', showFavOnly);
        favToggleBtn.setAttribute('aria-pressed', String(showFavOnly));
        render();
      });
    }
  }

  return { init, toggleFavorite, isFavorite: id => favorites.has(id) };
})();


/* =========================================
   Home — AI 채팅 & 냉장고 파먹기 추천
   ========================================= */
const Home = (() => {

  /* ---------- SNS 트렌딩 데이터 ---------- */

  const SNS_TRENDING = [
    {
      id: 't1', emoji: '🥘', name: '마라탕',
      mentions: 15400,
      hashtags: ['#마라탕', '#중식', '#매운맛'],
      bg: 'linear-gradient(135deg,#FFF0F5 0%,#FFE4D6 100%)',
    },
    {
      id: 't2', emoji: '🍜', name: '짜장 볶음밥',
      mentions: 8700,
      hashtags: ['#짜장볶음밥', '#중식', '#혼밥'],
      bg: 'linear-gradient(135deg,#FFF7ED 0%,#FEF3C7 100%)',
    },
    {
      id: 't3', emoji: '🥗', name: '그릭 요거트 볼',
      mentions: 6200,
      hashtags: ['#그릭요거트', '#건강식', '#다이어트'],
      bg: 'linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%)',
    },
    {
      id: 't4', emoji: '🍳', name: '에그 베네딕트',
      mentions: 4800,
      hashtags: ['#에그베네딕트', '#브런치', '#홈카페'],
      bg: 'linear-gradient(135deg,#FFFBEB 0%,#FEF9C3 100%)',
    },
    {
      id: 't5', emoji: '🥪', name: '스모어 샌드위치',
      mentions: 3900,
      hashtags: ['#샌드위치', '#브런치', '#카페감성'],
      bg: 'linear-gradient(135deg,#F0F9FF 0%,#E0F2FE 100%)',
    },
    {
      id: 't6', emoji: '🍱', name: '도시락 밥버거',
      mentions: 3200,
      hashtags: ['#밥버거', '#도시락', '#간편식'],
      bg: 'linear-gradient(135deg,#FDF4FF 0%,#FAE8FF 100%)',
    },
    {
      id: 't7', emoji: '🫕', name: '부대찌개 라볶이',
      mentions: 2600,
      hashtags: ['#라볶이', '#부대찌개', '#분식'],
      bg: 'linear-gradient(135deg,#FFF1F2 0%,#FFE4E6 100%)',
    },
  ];

  const snsSaved = new Set();

  function formatMentions(n) {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
    if (n >= 1000)  return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  function buildSNSCard(item) {
    const card = document.createElement('div');
    card.className = 'sns-card';

    /* 비주얼 영역 (정사각형 이미지) */
    const visual = document.createElement('div');
    visual.className = 'sns-card-visual';
    visual.style.background = item.bg;

    const emojiEl = document.createElement('div');
    emojiEl.className = 'sns-card-emoji';
    emojiEl.textContent = item.emoji;

    /* 북마크 버튼 */
    const bookmark = document.createElement('button');
    bookmark.className = `sns-card-bookmark${snsSaved.has(item.id) ? ' active' : ''}`;
    bookmark.setAttribute('aria-label', '저장');
    bookmark.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`;
    bookmark.addEventListener('click', e => {
      e.stopPropagation();
      snsSaved.has(item.id) ? snsSaved.delete(item.id) : snsSaved.add(item.id);
      bookmark.classList.toggle('active', snsSaved.has(item.id));
    });

    visual.append(emojiEl, bookmark);

    /* 정보 영역 */
    const info = document.createElement('div');
    info.className = 'sns-card-info';

    const name = document.createElement('div');
    name.className = 'sns-card-name';
    name.textContent = item.name;

    const mentions = document.createElement('div');
    mentions.className = 'sns-card-mentions';
    mentions.textContent = `지금 ${formatMentions(item.mentions)}명이 보고 있어요`;

    const tags = document.createElement('div');
    tags.className = 'sns-card-tags';
    item.hashtags.forEach(tag => {
      const t = document.createElement('span');
      t.className = 'sns-tag';
      t.textContent = tag;
      tags.appendChild(t);
    });

    info.append(name, mentions, tags);
    card.append(visual, info);
    return card;
  }

  function initSNSStrip() {
    const strip = document.getElementById('sns-strip');
    if (!strip) return;
    SNS_TRENDING.forEach(item => strip.appendChild(buildSNSCard(item)));
  }

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
        input.focus();
      })
      .catch(() => {
        sendBtn.disabled = false;
        appendMessage('서버 연결에 실패했어요. 잠시 후 다시 시도해주세요.', 'ai');
        input.focus();
      });
  }

  /* ---------- 냉장고 파먹기 추천 ---------- */

  function buildRecoCard(recipe, myIngredients) {
    const card = document.createElement('div');
    card.className = 'reco-card';

    /* --- 상단 비주얼 영역 --- */
    const visual = document.createElement('div');
    visual.className = 'reco-card-visual';

    // 이모지 (레시피 이미지 대체)
    const emojiEl = document.createElement('div');
    emojiEl.className = 'reco-card-emoji';
    emojiEl.textContent = recipe.emoji;

    // 북마크 버튼 (우측 상단 플로팅)
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = `reco-card-bookmark${Explore.isFavorite(recipe.id) ? ' active' : ''}`;
    bookmarkBtn.setAttribute('aria-label', '즐겨찾기');
    bookmarkBtn.innerHTML = `<svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`;
    bookmarkBtn.addEventListener('click', e => {
      e.stopPropagation();
      Explore.toggleFavorite(recipe.id);
      bookmarkBtn.classList.toggle('active', Explore.isFavorite(recipe.id));
    });

    // 재료 일치도 뱃지 (좌측 하단 오버레이)
    const ownedIngrs = recipe.ingredients.filter(ing => myIngredients.has(ing.toLowerCase()));
    const matchBadge = document.createElement('div');
    matchBadge.className = 'reco-match-badge';
    matchBadge.textContent = `${ownedIngrs.slice(0, 2).join(', ')} 포함 🌱`;

    visual.append(emojiEl, bookmarkBtn, matchBadge);

    /* --- 하단 정보 영역 --- */
    const info = document.createElement('div');
    info.className = 'reco-card-info';

    // 1. 요리 이름 (굵은 볼드체, 최대 2줄)
    const name = document.createElement('div');
    name.className = 'reco-card-name';
    name.textContent = recipe.name;

    // 2. 소요 시간 및 난이도
    const meta = document.createElement('div');
    meta.className = 'reco-card-meta';
    const diffColor = DIFF_COLOR[recipe.difficulty] || '#888';
    meta.innerHTML = `<span>⏱️ ${recipe.time}분</span><span class="reco-meta-sep">|</span><span style="color:${diffColor}">⭐ ${recipe.difficulty}</span>`;

    info.append(name, meta);

    // 3. 부족한 재료 안내 (선택)
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

    // 카드 클릭 → 상세 모달
    card.addEventListener('click', () => RecipeModal.open(recipe.id));

    return card;
  }

  function refreshFridgeRecos() {
    const strip = document.getElementById('fridge-reco-strip');
    if (!strip) return;
    strip.innerHTML = '';

    const fridgeData    = Storage.get('yorijori_ingredients', []);
    const myIngredients = new Set(
      fridgeData.map(i => (typeof i === 'string' ? i : i.name).toLowerCase())
    );

    if (myIngredients.size === 0) {
      strip.appendChild(createEmptyState(
        '🧊',
        '냉장고가 비어있어요',
        '냉장고 탭에서 재료를 추가하면\n맞춤 레시피를 추천해 드려요!'
      ));
      return;
    }

    // 레시피별 매칭 재료 수 계산 → 내림차순 정렬 → 상위 5개
    const scored = RECIPES
      .map(r => ({
        ...r,
        matchCount: r.ingredients.filter(ing => myIngredients.has(ing.toLowerCase())).length,
      }))
      .filter(r => r.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 5);

    if (scored.length === 0) {
      strip.appendChild(createEmptyState(
        '🥲',
        '맞는 레시피가 없어요',
        '재료를 더 추가하면 추천해 드릴게요!'
      ));
      return;
    }

    scored.forEach(r => strip.appendChild(buildRecoCard(r, myIngredients)));
  }

  /* ---------- 초기화 ---------- */

  function init() {
    refreshFridgeRecos();
    initSNSStrip();

    const input   = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    sendBtn?.addEventListener('click', sendMessage);
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) sendMessage();
    });
  }

  return { init, refreshFridgeRecos };
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

    bodyEl.innerHTML = '';
    bodyEl.appendChild(buildContent(recipe));

    overlay.removeAttribute('hidden');
    // 다음 프레임에 클래스를 추가해야 트랜지션이 재생됨
    requestAnimationFrame(() => overlay.classList.add('open'));
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
    emojiEl.textContent = recipe.emoji;

    const info = document.createElement('div');
    info.className = 'modal-recipe-info';

    const nameEl = document.createElement('h2');
    nameEl.className = 'modal-recipe-name';
    nameEl.id = 'modal-recipe-name';
    nameEl.textContent = recipe.name;

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

    info.append(nameEl, badgesEl, ingrEl);
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

    const ytCard = document.createElement('div');
    ytCard.className = 'modal-youtube-card';
    ytCard.innerHTML = `
      <div class="modal-youtube-thumb">
        <div class="modal-youtube-play-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
        <div class="modal-youtube-label">YouTube</div>
      </div>
      <p class="modal-youtube-title">${recipe.youtube_title}</p>
    `;

    ytSection.append(ytTitle, ytCard);
    frag.appendChild(ytSection);

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
   Category Chips (홈 화면) — 토글 선택
   ========================================= */
function initChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
}


/* =========================================
   Boot
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
  Home.init();
  Fridge.init();
  Explore.init();
  RecipeModal.init();
  initChips();
});
