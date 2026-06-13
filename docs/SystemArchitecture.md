# 요리조리 시스템 구성도

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (iOS)                             │
│                    React Native / Expo                          │
│                                                                 │
│  [ 홈 탭 ]  [ 레시피 탐색 ]  [ 냉장고 ]  [ 챗봇 ]  [ 설정 ]   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
          ┌────────────────┴────────────────┐
          │                                 │
          ▼                                 ▼
┌─────────────────────┐         ┌─────────────────────────┐
│   EC2 (AWS)         │         │  API Gateway (AWS)       │
│   Node.js / Express │         │  Lambda Functions        │
│   13.125.213.80     │         │  4ur32pd547.execute-api  │
│                     │         │  .ap-northeast-2         │
│  /api/recipes       │         │                          │
│  /api/fridge        │         │  POST /chat  (AI 챗봇)   │
│  /api/chat          │         │  POST /scan  (음성인식)  │
│  /api/user          │         │  POST /auth/google       │
│  /api/receipt       │         └────────────┬────────────┘
│  /api/youtube       │                      │
└──────────┬──────────┘              ┌───────┴────────┐
           │                         │                │
           ▼                         ▼                ▼
┌─────────────────────┐   ┌──────────────┐  ┌────────────────┐
│  RDS MySQL (AWS)    │   │  DynamoDB    │  │  Claude AI     │
│  sframe.cdqgkoym   │   │  (AWS)       │  │  (Bedrock)     │
│  8aye.ap-northeast │   │              │  │                │
│  -2.rds.amazonaws  │   │ 채팅 세션     │  │  자연어 처리   │
│                     │   │ 파티션키:    │  │  재료 추출     │
│  - user             │   │   userId     │  │  레시피 검색   │
│  - recipe           │   │ 정렬키:      │  │  의도 분류     │
│  - recipe_category  │   │   sessionId  │  └────────────────┘
│  - recipe_ingredient│   └──────────────┘
│  - recipe_step      │
│  - recipe_review    │
│  - user_fridge      │
│  - chat_history     │
└─────────────────────┘
```

## 주요 데이터 흐름

### 1. 구글 로그인
```
iPhone → API Gateway /auth/google
       → Google OAuth2 tokeninfo 검증
       → RDS user 테이블 upsert
       → userId, nickname 반환
```

### 2. 레시피 탐색
```
iPhone → EC2 /api/recipes
       → RDS recipe 조회 (카테고리, 검색어 필터)
       → 이미지 URL HTTPS 변환 후 반환
```

### 3. 냉장고 재료 관리
```
iPhone → EC2 /api/fridge/:userId  (GET/PUT)
       → RDS user_fridge 테이블 (JSON 배열 저장)
       → 로그아웃 시 로컬 초기화
```

### 4. AI 챗봇
```
iPhone → EC2 /api/chat
       → API Gateway Lambda /chat
       → Claude AI (의도 분류: FRIDGE_SAVE / RECIPE_SEARCH / CHAT)
       → 의도에 따라 RDS 조회 또는 냉장고 저장 액션 반환
       → chat_history RDS 저장
```

### 5. 음성 인식
```
iPhone → EC2 /api/scan (audio base64)
       → API Gateway Lambda /scan
       → 음성→텍스트 변환 결과 반환
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| 클라이언트 | React Native, Expo, iOS |
| 서버 | Node.js, Express, PM2 |
| 데이터베이스 | AWS RDS MySQL, AWS DynamoDB |
| 인프라 | AWS EC2, AWS API Gateway, AWS Lambda |
| 인증 | Google OAuth 2.0 |
| AI | Claude AI (AWS Bedrock) |
