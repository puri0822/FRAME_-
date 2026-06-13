# 요리조리 설치 가이드

## 개발 환경 요구사항

| 항목 | 버전 |
|------|------|
| Node.js | 18.x 이상 |
| npm | 9.x 이상 |
| Xcode | 15.x 이상 (iOS 빌드 필요) |
| CocoaPods | 최신 버전 |
| iOS | 16.0 이상 |

---

## 1. 프로젝트 클론

```bash
git clone https://github.com/puri0822/FRAME_-.git
cd FRAME_-
git checkout ios
```

---

## 2. 환경 변수 설정

`.env.example`을 복사해 `.env` 파일을 생성하고 값을 입력합니다.

```bash
cp .env.example .env
```

`.env` 파일 내용:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
```

> Google Cloud Console에서 OAuth 2.0 클라이언트 ID를 발급받아 입력합니다.

---

## 3. 패키지 설치

```bash
npm install
```

---

## 4. iOS CocoaPods 설치

```bash
npx pod-install
```

---

## 5. iOS 빌드 및 실행

```bash
npx expo run:ios
```

> Xcode 시뮬레이터 또는 실제 기기에서 앱이 실행됩니다.

---

## 6. 서버 설정 (선택)

백엔드 서버 주소는 `app/config/api.js`에서 변경할 수 있습니다.

```js
// app/config/api.js
export const EC2_BASE_URL = "http://YOUR_SERVER_IP:3000";
```

서버는 Node.js + Express로 구성되어 있으며 AWS EC2에서 PM2로 실행됩니다.

---

## 트러블슈팅

**Metro 포트 충돌 시**
```bash
kill $(lsof -ti:8081)
npx expo run:ios
```

**Pod 설치 오류 시**
```bash
cd ios && pod install --repo-update
```
