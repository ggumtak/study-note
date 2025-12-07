# 스터디 노트 APK 빌드 가이드

PWA를 Android APK로 변환하는 방법입니다.

---

## 방법 1: PWABuilder (가장 쉬움) ⭐

### 1. 로컬 서버 실행
```bash
# 폴더로 이동
cd "c:\Users\percy\Desktop\새 폴더 (2)\markdown-study-helper"

# 간단한 서버 실행 (Python 필요)
python -m http.server 8080

# 또는 Node.js
npx serve
```

### 2. ngrok으로 HTTPS 만들기
```bash
# ngrok 설치 후
npx ngrok http 8080
# https://xxxxx.ngrok.io 주소 복사
```

### 3. PWABuilder.com 접속
1. https://www.pwabuilder.com 접속
2. ngrok HTTPS 주소 입력
3. "Start" 클릭
4. "Package for stores" → "Android" 선택
5. APK 다운로드

---

## 방법 2: Bubblewrap CLI

### 1. 필수 설치
```bash
# Node.js 설치 후
npm install -g @anthropic/bubblewrap-cli

# Java JDK 설치 필요 (JDK 11+)
# Android SDK 설치 필요
```

### 2. 초기화
```bash
cd "c:\Users\percy\Desktop\새 폴더 (2)\markdown-study-helper"
bubblewrap init --manifest https://your-url/manifest.json
```

### 3. 빌드
```bash
bubblewrap build
# app-release-signed.apk 생성됨
```

---

## 방법 3: Android Studio TWA

### 1. Android Studio 설치
- https://developer.android.com/studio

### 2. 새 프로젝트 생성
- Empty Activity 선택
- Kotlin 선택

### 3. build.gradle 수정
```gradle
dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
}
```

### 4. AndroidManifest.xml
```xml
<activity android:name="com.example.LauncherActivity">
    <meta-data
        android:name="android.support.customtabs.trusted.DEFAULT_URL"
        android:value="https://your-pwa-url/" />
</activity>
```

### 5. Build > Generate Signed Bundle/APK

---

## 가장 추천하는 방법

### PWABuilder가 제일 쉽습니다!

1. **GitHub Pages에 배포** (무료 HTTPS)
   - GitHub에 코드 push
   - Settings > Pages > Deploy from branch
   - `https://username.github.io/repo-name/` 주소 생성

2. **PWABuilder.com에서 APK 생성**
   - GitHub Pages 주소 입력
   - 클릭 몇 번으로 APK 완성

---

## 빠른 테스트

Galaxy S7+에서 바로 테스트하려면:

1. **Chrome으로 PWA 설치**
   - 컴퓨터에서 `python -m http.server 8080`
   - 같은 WiFi의 태블릿 Chrome에서 `http://컴퓨터IP:8080` 접속
   - 주소창 우측 "설치" 또는 메뉴 > "홈 화면에 추가"

2. **USB 디버깅으로 APK 설치**
   - PWABuilder에서 받은 APK를 `adb install` 으로 설치
