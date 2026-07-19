# Prototype (프로토타입) - 개발 기술 명세서

본 어플리케이션은 동작 감지 센서 및 AI 스토리 엔진, 그리고 지인 고발 메시지 전송 시스템을 결합한 React Native 기반의 모바일 피트니스 서비스 프로토타입입니다.

---

## 1. 기술 스택 (Technical Stack)

* **프레임워크**: React Native (Expo SDK 54)
* **데이터베이스**: Google Cloud Firestore (연결 불가 시 로컬 In-Memory Mock DB 자동 대체)
* **사용자 인증**: Firebase Authentication (이메일/비밀번호 인증)
* **보행 센서**: Expo Sensors (Pedometer & Accelerometer)
* **메시지 연동**: Expo SMS API
* **스토리 AI**: OpenRouter API (무료 모델 자동 분배 경로 `openrouter/free` 탑재)

---

## 2. 프로젝트 소스코드 디렉토리 구조

```
/ (루트 폴더)
├── App.js                     # 메인 엔트리 및 바텀 탭 내비게이션 관리
├── app.json                   # 하드웨어 센서 권한 및 앱 메타데이터 설정
├── metro.config.js            # Expo 54 Polyfill 및 Firebase ESM 충돌 방지 빌드 Resolver
├── package.json               # 의존성 패키지 명세
├── README.md                  # [본 문서] 기술 명세서
│
├── screens/                   # 화면 단 UI 컴포넌트 폴더
│   ├── LoginScreen.js         # 이메일 인증 로그인 및 둘러보기(게스트 모드) 처리 화면
│   ├── HomeScreen.js          # 만보기 링 게이지, 캐릭터 성장, 꼼수 차단 경보 및 듀오 현황판 화면
│   ├── StoryScreen.js         # 걸음수에 따른 스토리 해금 및 AI 선택지 분기 화면
│   └── SettingsScreen.js      # 목표치 설정, 경고 연락처 관리 및 포인트 상점 화면
│
├── services/                  # 외부 모듈 및 하드웨어 API 연동 폴더
│   ├── firebase.js            # Firestore 실시간 읽기/쓰기 및 초기 닉네임 난수 생성 로직
│   ├── pedometer.js           # 기기 모션 데이터 연동 및 권한 획득 처리
│   ├── smsAlert.js            # expo-sms 수신인 파싱 및 메시지 발송 팝업 처리
│   └── aiStory.js             # AI 웹소설 챕터 생성 및 AI 반성 문자 작문 처리
│
└── assets/                    # 레벨별 캐릭터 정적 PNG 리소스 폴더
    ├── char_level0.png        # Lv.0 (돼지)
    ├── char_level1.png        # Lv.1 (인간)
    ├── char_level2.png        # Lv.2 (운동왕)
    └── char_level3.png        # Lv.3 (존예)
```

---

## 3. 데이터베이스 스키마 구조 (Firestore JSON)

데이터는 가입한 사용자의 고유 `UID`를 문서 식별자(Document ID)로 하여 관리됩니다.

### settings/{userId} (설정 데이터)
```json
{
  "targetSteps": 10000,
  "nickname": "날렵한토끼312",
  "duoName": "홍길동",
  "duoPhone": "010-1234-5678",
  "warningContacts": [
    { "name": "엄마", "phone": "010-9999-8888" }
  ]
}
```

### userStats/{userId} (통계 및 포인트 상점 인벤토리)
```json
{
  "todaySteps": 4200,
  "accumulatedSteps": 15600,
  "points": 230,
  "dailyGoalAchievements": 3,
  "todayGoalAchieved": false,
  "storyTheme": "drama",
  "lastResetDate": "Sun Jul 19 2026",
  "lastRandomBoxDate": "Sun Jul 19 2026",
  "shieldActive": true,
  "storyKeys": 1
}
```

### storyHistory/{userId} (소설 진행 내역)
```json
[
  {
    "id": "1",
    "themeId": "drama",
    "content": "눈을 떠보니 어제 보던 드라마 세계관이었다.",
    "options": [
      { "text": "아는 척을 해본다.", "costPoints": 0 },
      { "text": "무시하고 지나간다.", "costPoints": 10 }
    ],
    "selectedOption": "무시하고 지나간다."
  }
]
```

---

## 4. 구동 및 빌드 환경 설정

### 의존성 설치
본 프로젝트는 Expo SDK 54 환경으로 의존성 패키지 충돌 방지를 위해 반드시 `--legacy-peer-deps` 옵션을 추가하여 설치해야 합니다.
```bash
npm install --legacy-peer-deps
```

### 개발 서버 실행
```bash
# 기본 구동 (Metro Bundler)
npx expo start --port 5000

# 외부 기기(Expo Go) 무선 테스트 및 터널링 구동
npx expo start --tunnel --port 5000

# 캐시 초기화 후 구동
npx expo start --tunnel --port 5000 --clear
```

---

## 5. 시연용 컨트롤 패널 작동 가이드 (Demo Controls)

발표 및 채점 시 실시간 만보 달성이 불가능한 제약을 극복하기 위해 홈 화면 최하단에 무조건 활성화되는 시연용 컴포넌트가 탑재되어 있습니다.

1. **걸음수 조작 버튼**: `+1,000보` 및 `-1,000보` 버튼을 눌러 실시간 링 게이지 애니메이션 및 수치 증감을 즉각 시연할 수 있습니다.
2. **달성일수 추가 버튼**: `🏆 만보 달성일수 +1일 (레벨업 테스트)` 버튼을 누르면 화면에 팝업창(Alert) 방해 없이 실시간으로 달성도가 올라가며, 단계별 캐릭터 외형의 실시간 진화(레벨업) 과정을 연타하여 매끄럽게 선보일 수 있습니다.
