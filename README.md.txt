# 🐷 걸음수 기반 청소년 활동량 증진 앱 (프로젝트명 미정)

> 해커톤 주제: **청소년 활동량 부족 문제 해결**
> 심사기준: 협력성 / 아이디어 / 일상 속 문제 정의와 해결 아이디어

---

## 📌 프로젝트 개요

청소년들이 부족한 신체활동량을 자발적으로 늘릴 수 있도록, 걸음수 기반의 게임화(Gamification) 요소를 결합한 모바일 앱입니다. 캐시워크 등 기존 걸음수 앱의 리워드 구조를 참고하되, **사회적 동기부여(연락처 알림)**, **시각적 성장 보상(캐릭터 변화)**, **스토리텔링 동기부여(AI 생성 이야기)** 세 가지 축으로 차별화했습니다.

---

## ✨ 핵심 기능

### 1. 목표 걸음수 미달성 시 랜덤 연락처에게 랜덤 메시지 발송
- 사용자가 미리 선택한 연락처 목록 중 랜덤으로 대상 지정
- 준비된 메시지 풀 중 랜덤으로 문구 선택
- **설계 원칙**: 개인정보 보호 및 스팸 방지를 위해 완전 자동 발송이 아닌, 시스템 문자 작성창을 열어 **사용자 확인 후 발송**되는 방식으로 구현 (iOS/Android 정책상 앱의 무단 자동 SMS 발송은 지원되지 않음)

### 2. 누적 걸음수 기반 캐릭터 성장 시스템
- 초기 캐릭터: 귀여운 돼지
- 누적 걸음수 threshold 도달 시 → 점진적으로 예쁜/잘생긴 캐릭터로 변화
- 로컬 이미지 자산 기반, 조건부 렌더링으로 구현

### 3. 걸음수 기반 AI 인터랙티브 스토리 + 포인트/선택지 시스템
- 특정 걸음수(예: 100보) 도달마다 AI가 이야기의 다음 부분을 생성
- 이전 스토리 맥락을 프롬프트에 유지하여 연속성 있는 이야기 전개
- 걸음수 누적 + 일일 미션(예: 하루 만보 달성)으로 포인트 적립
- 포인트가 일정 기준 도달 시 스토리 선택지 활성화 → 사용자가 이후 전개 방향 선택 가능

---

## 🛠 기술 스택 (전부 무료 티어로 구현 가능)

| 영역 | 도구 |
|---|---|
| 프론트엔드 (앱) | Expo (React Native) |
| 걸음수 측정 | expo-sensors — Pedometer |
| 연락처 접근 | expo-contacts |
| 메시지 발송 UI | expo-sms |
| 로그인 / 데이터 저장 | Firebase (Authentication + Firestore) |
| AI 스토리 생성 | Claude API 또는 Google AI Studio (Gemini) |
| 협업 / 버전관리 | GitHub |
| 캐릭터 디자인 | Figma 또는 팀 자체 제작 |
| 개발 중 실기기 테스트 | Expo Go 앱 (Mac/Xcode 불필요) |

---

## ✅ 사전 가입해야 할 계정

- [ ] **Expo** (https://expo.dev) — 프로젝트 생성 및 빌드
- [ ] **GitHub** — 팀 협업 및 버전관리
- [ ] **Firebase** (Google 계정으로 가입) — 사용자 데이터, 포인트, 걸음수 기록 저장
- [ ] **Anthropic Console** 또는 **Google AI Studio** — AI 스토리 생성용 API 키 발급
- [ ] (선택) **Figma** — 캐릭터 단계별 이미지 제작

---

## 📂 프로젝트 구조

```
MyApp/
├── App.js
├── screens/
│   ├── HomeScreen.js        # 오늘 걸음수, 캐릭터 표시
│   ├── StoryScreen.js       # AI 스토리 언락 화면
│   ├── SettingsScreen.js    # 연락처 선택, 목표 걸음수 설정
├── services/
│   ├── pedometer.js         # 걸음수 측정 로직
│   ├── firebase.js          # DB 연동
│   ├── aiStory.js           # AI API 호출
│   ├── smsAlert.js          # 미달성시 메시지 발송
├── assets/
│   └── characters/          # 돼지 → 캐릭터 단계별 이미지
```

---

## ⚠️ 구현 시 알아둘 기술적 제약

- **Pedometer 업데이트는 앱이 백그라운드일 때 전달되지 않으며**, 과거 7일치 데이터만 조회 가능합니다. → "저녁 시간대에 앱을 열면 목표 달성 여부를 체크하고 알림/문자 작성창을 띄우는" 흐름으로 설계하는 것이 현실적입니다.
- **SMS는 사용자 확인 후 발송**되는 구조입니다 (완전 자동 발송 불가). 오히려 개인정보 보호 관점의 설계 의도로 발표에 활용하면 좋습니다.
- AI API는 무료 크레딧으로 해커톤 시연 분량은 충분하나, 실서비스 확장 시 비용 검토가 필요합니다.

---

## 🚀 개발 시작하기 (Windows 기준)

```bash
# 1. Node.js LTS 설치 (nodejs.org)
node -v
npm -v

# 2. Expo 프로젝트 생성
npx create-expo-app 앱이름
cd 앱이름

# 3. 개발 서버 실행
npx expo start

# 4. 아이폰에 Expo Go 앱 설치 후 QR코드 스캔 → 실시간 테스트
```

---

## 🏆 심사기준 대응 전략

| 기준 | 어필 포인트 |
|---|---|
| 문제 정의 | 청소년 활동량 부족의 원인(동기 부족, 강제성 없음)을 명확히 짚고 해결 구조 설계 |
| 해결 아이디어 | SMS(사회적 압박) · 캐릭터(시각적 보상) · AI 스토리(게임화된 동기부여) — 서로 다른 동기부여 심리를 겨냥 |
| 협력성 | GitHub 커밋 로그, Figma 협업 히스토리를 발표자료에 근거로 첨부 |

---

## 📚 참고 자료 (Expo 공식 문서)

- Pedometer: https://docs.expo.dev/versions/latest/sdk/pedometer/
- Contacts: https://docs.expo.dev/versions/latest/sdk/contacts/
- SMS: https://docs.expo.dev/versions/latest/sdk/sms/
- Sensors 개요: https://docs.expo.dev/versions/latest/sdk/sensors/
- create-expo-app: https://docs.expo.dev/more/create-expo/
- Expo Go: https://expo.dev/go