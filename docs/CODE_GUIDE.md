# 요리조리 코드 설명

## 프로젝트 구조

```
yorijori/
├── app/
│   ├── (tabs)/              # 탭 화면 (메인 기능)
│   │   ├── home.js          # 홈 화면 (AI 챗봇)
│   │   ├── explore.js       # 레시피 탐색
│   │   ├── fridge.js        # 냉장고 관리
│   │   ├── main.js          # 메인 레이아웃
│   │   └── _layout.js       # 탭 네비게이션 설정
│   ├── auth/
│   │   └── login.js         # Google 로그인 화면
│   ├── config/
│   │   └── api.js           # API 엔드포인트 설정
│   ├── context/
│   │   └── AuthContext.js   # 로그인 상태 전역 관리
│   └── store.js             # 냉장고 재료 전역 상태
├── styles/
│   ├── colors.js            # 앱 전체 색상 팔레트
│   └── tabs/                # 각 탭별 스타일시트
├── docs/                    # 프로젝트 문서
├── ios/                     # iOS 네이티브 설정
└── assets/                  # 아이콘, 이미지
```

---

## 주요 파일 설명

### `app/config/api.js`
서버 API 주소를 한 곳에서 관리합니다.

```js
export const EC2_BASE_URL = "http://3.39.25.163:3000";

export const EC2_ENDPOINTS = {
  recipes:     `${EC2_BASE_URL}/api/recipes`,       // 레시피 목록
  fridge:      `${EC2_BASE_URL}/api/fridge`,        // 냉장고 재료
  chat:        `${EC2_BASE_URL}/api/chat`,          // AI 챗봇
  chatHistory: `${EC2_BASE_URL}/api/chat/history`,  // 채팅 기록
  youtube:     `${EC2_BASE_URL}/api/youtube/search`,// 유튜브 검색
  receipt:     `${EC2_BASE_URL}/api/receipt`,       // 영수증 스캔
};

// Google 로그인은 API Gateway(Lambda)를 통해 처리
export const AUTH_ENDPOINTS = {
  google: `${API_BASE_URL}/auth/google`,
  me:     `${API_BASE_URL}/auth/me`,
};
```

---

### `app/context/AuthContext.js`
Google 로그인 상태를 앱 전체에서 사용할 수 있도록 React Context로 관리합니다.

- `user` 객체: 로그인한 사용자 정보 (userId, nickname 등)
- `signIn()`: Google OAuth 로그인 실행
- `signOut()`: 로그아웃

```js
const { user } = useAuth(); // 어느 화면에서든 사용 가능
```

---

### `app/store.js`
냉장고 재료 목록을 탭 간에 공유하기 위한 전역 상태입니다.

- `getIngredients()`: 현재 냉장고 재료 목록 반환
- `setExploreSearchCallback()`: 홈 화면 검색창에서 레시피 탐색 탭으로 검색어 전달

---

### `app/(tabs)/home.js` — AI 챗봇

- Claude AI API와 EC2를 통해 통신
- 채팅 히스토리를 RDS MySQL(`chat_history` 테이블)에 저장
- 대화 내역 불러오기/삭제 기능 포함

---

### `app/(tabs)/explore.js` — 레시피 탐색

**주요 상태**
```js
const [allRecipes, setAllRecipes]   // 전체 레시피 목록
const [filtered, setFiltered]       // 필터/검색 결과
const [likedIds, setLikedIds]       // 좋아요한 레시피 ID Set
const [favorites, setFavorites]     // 추천 섹션 북마크 Set
```

**좋아요 영속성**
- AsyncStorage에 유저별(`liked_${userId}`) 키로 좋아요 목록 저장
- 앱 재시작 시 자동으로 불러옴

**레시피 추천**
- 냉장고 재료(`store.js`)와 레시피 재료를 비교해 매칭률(%) 계산
- 매칭률 높은 순으로 추천 섹션에 표시

---

### `app/(tabs)/fridge.js` — 냉장고 관리

**주요 기능**
- 재료 직접 추가/삭제
- 카테고리별 분류 (채소/과일, 육류/수산, 유제품, 가공식품, 양념)
- 영수증 카메라 스캔 → OCR로 재료 자동 인식

**유통기한 자동 추정 (`guessExpiry`)**
재료명 또는 카테고리를 기반으로 유통기한을 자동 설정합니다.

```js
// 재료명 기반 (예: 우유 → 3일, 계란 → 21일)
const EXPIRY_NAME_DAYS = { 우유: 3, 계란: 21, 대파: 7, ... }

// 카테고리 기반 fallback
const EXPIRY_CAT_DAYS = { "채소/과일": 7, "육류/수산": 3, ... }
```

---

### `styles/colors.js` — 색상 팔레트

앱 전체의 색상을 `C` 객체로 관리합니다.

```js
C.primary    // 메인 색상 (#FF6B35 오렌지)
C.bg         // 배경색
C.surface    // 카드 배경색
C.text       // 기본 텍스트 색상
C.textMuted  // 보조 텍스트 색상
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React Native, Expo |
| 백엔드 | Node.js, Express, PM2 |
| 데이터베이스 | AWS RDS (MySQL) |
| 인증 | Google OAuth 2.0, AWS API Gateway, Lambda |
| AI | Anthropic Claude API (챗봇), AWS Bedrock Titan (시맨틱 검색) |
| 외부 API | YouTube Data API v3 |
| 로컬 저장소 | AsyncStorage |
