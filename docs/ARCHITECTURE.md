# 시스템 아키텍처

## 현재 구조 (웹)

```
[ 클라이언트 (Browser) ]
  yorijori/index.html
  yorijori/app.js
  yorijori/style.css
          |
          | HTTP/HTTPS
          ▼
[ Express 서버 (EC2: 3.35.4.184) ]
  server/index.js  (Port 3000)
          |
    ┌─────┴──────────────────────────────┐
    │  API Routes                        │
    ├── /api/recipes        recipes.js   │
    ├── /api/recipe-categories           │
    │         categories.js              │
    ├── /api/youtube        youtube.js   │
    ├── /api/receipt        receipt.js   │
    ├── /api/chat/history                │
    │         chat-history.js            │
    ├── /api/chat           (inline)     │
    ├── /api/auth/google    (inline)     │
    └── /api/user/nickname  (inline)     │
          |                              │
  ┌───────┴──────┐                       │
  ▼              ▼                       │
[ MySQL DB ]  [ AWS API Gateway ]        │
(EC2 내부)    ap-northeast-2             │
              ├── /auth/google           │
              │     Google OAuth 검증    │
              ├── /chat                  │
              │     Claude AI 챗봇       │
              └── /scan                  │
                    영수증 OCR           │
```

## 목표 구조 (모바일 앱)

```
[ 모바일 앱 (React Native / Expo) ]
  Android / iOS
          |
          | HTTPS
          ▼
[ Express 서버 (EC2) ]
  현재 서버 재사용 or API 서버 분리
          |
    ┌─────┴───────────────────────────────┐
    │  기존 API 유지 + 앱 전용 API 추가   │
    ├── /api/recipes                      │
    ├── /api/recipe-categories            │
    ├── /api/youtube                      │
    ├── /api/receipt       (영수증 OCR)   │
    ├── /api/chat                         │
    ├── /api/auth/google                  │
    └── /api/user/nickname                │
          |
  ┌───────┴──────┐
  ▼              ▼
[ MySQL DB ]  [ AWS API Gateway ]
(EC2 내부)    ├── /auth/google  → Google OAuth
              ├── /chat         → Claude AI
              └── /scan         → OCR (영수증)
```

## 주요 기술 스택

| 구분 | 현재 (웹) | 목표 (앱) |
|---|---|---|
| 프론트엔드 | Vanilla JS (SPA) | React Native + Expo |
| 백엔드 | Node.js + Express | Node.js + Express (유지) |
| DB | MySQL 8.0 | MySQL 8.0 (유지) |
| 인증 | Google OAuth (웹) | Google OAuth (앱 네이티브) |
| AI 챗봇 | Claude API (AWS Gateway) | Claude API (AWS Gateway) |
| OCR | AWS API Gateway | AWS API Gateway |
| 인프라 | EC2 (SafeRole-sgu-frame) | EC2 (SafeRole-sgu-frame) |
| 프로세스 관리 | PM2 | PM2 |

## 서비스 기능 요약

- **냉장고 관리**: 재료 추가/수정/삭제, 유통기한 관리
- **레시피 탐색**: 카테고리별 레시피, 재료 기반 추천
- **리뷰**: 별점 + 코멘트 + 좋아요
- **즐겨찾기**: 레시피 북마크
- **AI 챗봇**: 재료 저장 / 레시피 검색 / 자유 대화
- **영수증 OCR**: 영수증 촬영 → 재료 자동 등록
- **Google 로그인**: OAuth 2.0
