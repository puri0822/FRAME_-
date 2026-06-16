# 요리조리

냉장고 속 재료로 요리를 추천해주는 Android/IOS 앱입니다.

---

## 다운로드

> Android 기기에 직접 설치할 수 있는 APK 파일을 제공합니다.

[![APK 다운로드](https://img.shields.io/badge/APK_다운로드-최신버전-brightgreen?style=for-the-badge&logo=android&logoColor=white)](https://github.com/puri0822/FRAME_-/releases/latest/download/app-release.apk)

### 최신 버전 받기

**[Releases 페이지](https://github.com/puri0822/FRAME_-/releases/latest)** 에서 `app-release.apk` 파일을 다운로드하세요.

---

## 설치 방법

### 1단계 — APK 다운로드

[Releases 페이지](https://github.com/puri0822/FRAME_-/releases)에 접속하여 최신 릴리즈의 `app-release.apk`를 탭합니다.

### 2단계 — 알 수 없는 앱 허용

Android 기기에서 APK를 설치하려면 **출처를 알 수 없는 앱** 설치를 허용해야 합니다.

| Android 버전 | 경로 |
|---|---|
| Android 8.0 이상 | 설정 → 앱 → 특수 앱 접근 권한 → 알 수 없는 앱 설치 |
| Android 7.0 이하 | 설정 → 보안 → 알 수 없는 출처 |

### 3단계 — 설치

다운로드한 `app-release.apk` 파일을 열어 설치를 완료합니다.

---

## 자동 배포

`main` 또는 `frontend` 브랜치에 푸시하면 **GitHub Actions**가 자동으로 APK를 빌드하고 [Releases](https://github.com/puri0822/FRAME_-/releases)에 업로드합니다.

```
push to main/frontend
       ↓
  GitHub Actions
       ↓
  Gradle 빌드 (assembleRelease)
       ↓
  GitHub Releases 자동 배포
```

---

## 요구 사항

- Android 6.0 (API 23) 이상
- 저장 공간 약 50MB 이상
