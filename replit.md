# 핑키 피트니스 (Pinky Fitness)

걸음수 기반 청소년 활동량 증진 앱 — 해커톤 프로젝트

## 프로젝트 개요

청소년들이 신체활동을 자발적으로 늘릴 수 있도록, 세 가지 동기부여 축을 결합한 모바일 앱입니다:
- 🚨 목표 미달성 시 연락처에 경고 SMS 발송 (사회적 동기부여)
- 🐷 누적 걸음수에 따른 캐릭터 성장 (시각적 보상)
- 📖 AI 생성 인터랙티브 스토리 (게임화 동기부여)

## 기술 스택

| 영역 | 도구 |
|------|------|
| 프레임워크 | Expo (React Native) |
| 걸음수 측정 | expo-sensors Pedometer |
| 연락처 접근 | expo-contacts |
| SMS 발송 UI | expo-sms |
| 데이터 저장 | Firebase Firestore (미설정 시 Mock 모드) |
| AI 스토리 생성 | Google Gemini API (미설정 시 오프라인 분기) |

## 프로젝트 구조

```
/
├── App.js                  # 루트 앱 + 하단 탭 내비게이션
├── screens/
│   ├── HomeScreen.js       # 오늘 걸음수, 캐릭터 표시
│   ├── StoryScreen.js      # AI 스토리 언락 화면
│   └── SettingsScreen.js   # 연락처 및 목표 걸음수 설정
├── services/
│   ├── pedometer.js        # 걸음수 측정 로직
│   ├── firebase.js         # Firestore 연동 (Mock 포함)
│   ├── aiStory.js          # Gemini API 호출 (오프라인 백업 포함)
│   └── smsAlert.js         # 경고 SMS 발송
├── package.json
├── app.json
└── babel.config.js
```

## 실행 방법

Replit에서 **핑키 피트니스 (웹)** 워크플로우를 실행하세요:

```bash
npx expo start --web --port 5000
```

웹 브라우저에서 앱을 확인할 수 있습니다. 만보기/SMS/연락처 기능은 실제 모바일 기기(Expo Go 앱)에서만 동작합니다.

## 환경변수 (선택)

Firebase와 Gemini API를 연동하려면 다음 환경변수를 설정하세요:

| 변수명 | 설명 |
|--------|------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API 키 |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth 도메인 |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API 키 |

미설정 시 앱은 자동으로 **Mock 모드**로 동작합니다 (기능 시연 가능).

## 모바일 테스트

실제 스마트폰에서 테스트하려면:
1. 스마트폰에 **Expo Go** 앱 설치
2. `npx expo start` 실행 후 QR코드 스캔

## User Preferences

없음
