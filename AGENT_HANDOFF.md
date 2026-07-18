# 핑키 피트니스 — AI 작업 인수인계 문서

> 이 문서는 이 프로젝트에서 작업한 모든 과정과, 향후 AI가 작업할 때 반드시 지켜야 할 규칙을 정리한 것입니다.

---

## 1. 프로젝트 개요

**앱명**: 핑키 피트니스  
**플랫폼**: Expo SDK 54 (React Native), 웹(Metro) + iOS/Android(Expo Go)  
**포트**: 5000  
**실행 명령**: `npx expo start --tunnel --port 5000`  
**데이터**: Firebase Firestore (미설정 시 In-Memory Mock DB 자동 폴백)  
**AI 스토리**: Gemini API (미설정 시 오프라인 분기)

### 핵심 기능
| 기능 | 설명 |
|------|------|
| 실시간 만보기 | iOS HealthKit / Android 기록 → `expo-sensors` Pedometer |
| 캐릭터 진화 | 만보(10,000보) 달성 일수 기준 (10일/30일/100일) |
| 랜덤 스토리 | 누적 걸음 1,000보마다 챕터 해금, 8가지 랜덤 테마 |
| 경고 문자 | 목표 미달성 시 등록된 연락처 1명에게 `expo-sms`로 문자 |
| 닉네임 | 설정에서 입력 → 캐릭터명이 `돼지○○ / 인간○○ / 운동왕○○ / 존예○○`으로 변경 |

---

## 2. 작업 이력 (시간순)

### 2-1. 초기 셋업 (GitHub 레포 import)
- `pjina3644/hanyang` 레포를 Replit으로 가져옴
- 기존 SDK 52 → **SDK 54**로 업그레이드 (사용자 Expo Go 버전 맞춤)
- 의존성 충돌로 인해 **`npm install --legacy-peer-deps`** 필수 사용

### 2-2. 기능 개편

#### 닉네임 시스템
- `SettingsScreen.js`: 닉네임 입력 필드 추가 → Firebase `settings.nickname` 저장
- `HomeScreen.js`: `getCharacterInfo(days, nickname)` 함수로 `돼지${n}` 형태 캐릭터명 생성

#### AI 일러스트 교체
- 기존 이모지 → AI 생성 PNG 4장 (`assets/char_level0~3.png`)
- `Image` 컴포넌트로 표시, `static require` 방식 사용 (동적 require 불가)

#### 레벨업 기준 변경
- 기존: 누적 걸음수 기반
- 변경: **만보(10,000보) 달성 일수** 누적 (10일/30일/100일)

#### 스토리 시스템 재설계 (`services/aiStory.js`)
- 8가지 랜덤 테마 (좀비/우주/아이돌/이세계/쉐프/시간여행/엽기탐정/마법학교)
- 챕터 해금 기준: `floor(accumulatedSteps / 1000)`
- Gemini 미연결 시 테마별 오프라인 분기 내장

### 2-3. Metro 번들러 오류 수정 (중요)

**오류**: `Unable to resolve "./polyfill" from expo-modules-core/src/ensureNativeModulesAreInstalled.ts`

**원인**: `expo-modules-core@3.x` (SDK 54)는 TypeScript 소스(`src/`) 배포 방식을 사용하는데, Metro 웹 번들러가 하위 디렉토리의 `index.ts`를 자동 탐지하지 못함.

**해결**: `metro.config.js` 작성 — `resolveRequest` 커스텀 훅으로 명시적 경로 지정:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);

const orig = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './polyfill' &&
    context.originModulePath.includes('expo-modules-core') &&
    context.originModulePath.includes('ensureNativeModulesAreInstalled')
  ) {
    const ext = platform === 'web' ? 'index.web.ts' : 'index.ts';
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-modules-core/src/polyfill', ext),
      type: 'sourceFile',
    };
  }
  return orig ? orig(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
```

### 2-4. Expo Go (아이폰) 흰화면 해결

**원인**: `npx expo start --web`은 내부 IP(`172.24.x.x`)만 사용 → 외부 기기(아이폰)에서 접근 불가.

**해결**: `--tunnel` 옵션 추가
- `@expo/ngrok@^4.1.0` 설치 (`npm install --legacy-peer-deps`)
- 워크플로우 명령 변경: `npx expo start --tunnel --port 5000`
- 결과: `exp://xxxx.exp.direct` 공개 URL 생성 → Expo Go QR 스캔으로 접속

### 2-5. 실제 만보기 + 문자 연동

#### 만보기 (`services/pedometer.js`)
- `Pedometer.requestPermissionsAsync()` 권한 요청 내장 (별도 호출 불필요)
- `checkPedometerAvailability()`: 권한 요청 후 가용성 확인
- `startStepCountSubscription(cb)`: 구독 이후 누적 걸음수 콜백
- `getStepCountRange(start, end)`: 특정 시간 범위 걸음수 (HealthKit/Android 기록)

#### HomeScreen.js 만보기 통합 로직
```
1. getUserStats() + getAppSettings() 병렬 로드
2. lastResetDate !== today → 자정 리셋 (todaySteps=0, todayGoalAchieved=false)
3. checkPedometerAvailability() → 권한 자동 요청
4. getStepCountRange(자정, 지금) → baseStepsRef.current에 저장
5. watchStepCount(cb) → total = baseStepsRef + stepsFromSub
6. delta = total - lastTotalRef → accumulatedSteps 보정
7. steps >= targetSteps + !todayGoalAchieved → 달성 팝업 (goalAlertShownRef로 중복 방지)
```

#### 경고 문자 (`services/smsAlert.js`) — 중요 버그 수정
- **버그**: contacts가 `{name, phone}` 객체 배열인데 `expo-sms`는 **문자열 배열**만 허용
- **수정**: 입력이 객체든 문자열이든 자동 변환 + `null`/`undefined` 필터링
- **제약**: iOS/Android 정책상 완전 자동 발송 불가 → 네이티브 문자 앱이 열리고 사용자가 전송 버튼 클릭 필요

#### app.json 권한 추가
```json
"ios": {
  "infoPlist": {
    "NSMotionUsageDescription": "걸음수를 실시간으로 측정하기 위해 동작 센서 접근 권한이 필요합니다.",
    "NSHealthUpdateUsageDescription": "건강 데이터에 걸음수를 기록합니다.",
    "NSHealthShareUsageDescription": "오늘의 걸음수를 불러오기 위해 건강 데이터 접근이 필요합니다."
  }
},
"android": {
  "permissions": ["android.permission.ACTIVITY_RECOGNITION"]
}
```

---

## 3. 파일 구조

```
/
├── App.js                    # 루트 내비게이션 (탭 3개: 홈/스토리/설정)
├── app.json                  # Expo 설정 + iOS/Android 권한
├── metro.config.js           # Metro 번들러 커스텀 resolver (SDK 54 필수)
├── babel.config.js           # Expo babel preset
├── package.json              # Expo 54, React 19.1, RN 0.81.5
│
├── screens/
│   ├── HomeScreen.js         # 만보기, 캐릭터, 경고문자 메인 화면
│   ├── StoryScreen.js        # AI 스토리 (랜덤 테마, 걸음수 챕터 해금)
│   └── SettingsScreen.js     # 닉네임, 목표 걸음수, 경고 연락처 설정
│
├── services/
│   ├── firebase.js           # Firestore + In-Memory Mock DB 폴백
│   ├── pedometer.js          # expo-sensors 만보기 (권한 요청 포함)
│   ├── smsAlert.js           # expo-sms 경고 문자 (객체/문자열 입력 모두 허용)
│   └── aiStory.js            # Gemini API 스토리 생성 + 오프라인 분기
│
└── assets/
    ├── char_level0.png       # AI 생성 캐릭터 (레벨 0: 소파 돼지)
    ├── char_level1.png       # 레벨 1
    ├── char_level2.png       # 레벨 2
    └── char_level3.png       # 레벨 3 (존예)
```

---

## 4. 환경 변수 / 시크릿

| 키 | 용도 | 미설정 시 동작 |
|----|------|---------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase 연결 | In-Memory Mock DB 사용 |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase | 동일 |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase | 동일 |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase | 동일 |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase | 동일 |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase | 동일 |
| `EXPO_PUBLIC_GEMINI_API_KEY` | AI 스토리 | 오프라인 분기 사용 |
| `SESSION_SECRET` | (예약) | — |

---

## 5. 향후 AI가 작업 시 반드시 지켜야 할 규칙

### ❶ 패키지 설치는 반드시 `--legacy-peer-deps`

```bash
# ✅ 올바름
npm install <package> --legacy-peer-deps

# ❌ 틀림 — peer dep 충돌로 설치 실패
npm install <package>
```

Expo 54 + React 19.1 환경에서 대부분의 서드파티 패키지가 peer dep 충돌을 일으킴.

---

### ❷ `metro.config.js`는 절대 삭제하지 말 것

`metro.config.js`가 없으면 `expo-modules-core` polyfill 경로를 찾지 못해 **번들 자체가 실패**.  
수정할 경우 `getDefaultConfig`를 기반으로 하고, `resolveRequest` 커스텀 훅을 반드시 유지할 것.

---

### ❸ 이미지는 반드시 `static require`

```js
// ✅ 올바름 — Metro가 빌드 타임에 번들링
const IMAGES = [
  require('../assets/char_level0.png'),
  require('../assets/char_level1.png'),
];

// ❌ 틀림 — 런타임 동적 require는 Metro가 추적 불가
const IMAGES = levels.map(i => require(`../assets/char_level${i}.png`));
```

---

### ❹ `expo-sms`에는 반드시 문자열 배열만 전달

```js
// ✅ 올바름
const phones = contacts.map(c => typeof c === 'string' ? c : c.phone).filter(Boolean);
await SMS.sendSMSAsync(phones, message);

// ❌ 틀림 — 객체 배열 전달 시 네이티브 타입 캐스팅 오류
await SMS.sendSMSAsync(contacts, message);
```

---

### ❺ `expo-sensors` Pedometer: base + subscription 패턴 사용

`Pedometer.watchStepCount`의 콜백은 **구독 시작 이후 누적 걸음수**를 줌.  
절대 이 값을 바로 `setSteps`하지 말 것 — HealthKit에서 불러온 기준값(base)에 더해야 함.

```js
// ✅ 올바른 패턴
const base = await Pedometer.getStepCountAsync(startOfDay, now); // HealthKit 기준값
baseRef.current = base.steps;
Pedometer.watchStepCount(({ steps: fromSub }) => {
  setSteps(baseRef.current + fromSub); // 기준 + 구독 이후 증가분
});

// ❌ 틀림 — fromSub는 구독 시작 후 증가분일 뿐, 하루 전체 걸음수가 아님
Pedometer.watchStepCount(({ steps }) => setSteps(steps));
```

---

### ❻ Expo Go 외부 접근 = 반드시 `--tunnel`

Replit 내부 IP(`172.x.x.x`)는 외부 기기(아이폰 등)에서 접근 불가.  
워크플로우 명령은 반드시 `npx expo start --tunnel --port 5000` 유지.

---

### ❼ `app.json` iOS 권한 유지

만보기를 사용하려면 아래 권한이 `app.json`에 존재해야 함. 삭제 금지.

```json
"NSMotionUsageDescription": "...",
"NSHealthShareUsageDescription": "..."
```

Android: `"android.permission.ACTIVITY_RECOGNITION"`

---

### ❽ Mock DB 필드 추가 시 `firebase.js`의 `mockDB`도 동기화

Firebase 미연결 상태에서도 앱이 정상 동작하도록, 새 필드를 Firebase에 추가할 때는  
`mockDB.userStats` 또는 `mockDB.settings`에도 동일하게 추가할 것.

---

### ❾ 새 화면/서비스 추가 시 체크리스트

- [ ] `App.js` 탭 네비게이션에 등록했는가?
- [ ] Firebase 함수는 mock 폴백이 있는가?
- [ ] 이미지는 `assets/`에 놓고 static require를 사용하는가?
- [ ] iOS 권한이 필요한 기능이면 `app.json` `infoPlist`에 추가했는가?
- [ ] 패키지 설치는 `--legacy-peer-deps`로 했는가?

---

## 6. 알려진 제약 사항

| 항목 | 내용 |
|------|------|
| 문자 자동 발송 | iOS/Android 정책상 불가. 네이티브 문자 앱이 열리고 사용자가 전송 버튼 클릭 필요 |
| 웹에서 만보기 | 브라우저는 Pedometer 미지원 → 시뮬레이터 모드(수동 버튼)로 자동 전환 |
| Firebase 미설정 | In-Memory Mock → **앱 재시작 시 데이터 초기화됨** |
| Expo Go QR | 터널 URL(`exp://xxxx.exp.direct`)로만 접속 가능, 내부 IP QR은 외부에서 불가 |
| SDK 54 + Metro | `metro.config.js` 없으면 웹 번들 빌드 실패 |

---

*최종 업데이트: 2026-07-18*
