import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};

let app;
let db = null;
let auth = null;
let isFirebaseActive = false;

// 최초 임의 닉네임 생성기
export function generateRandomNickname() {
  const adjs = ['날렵한', '달리는', '씩씩한', '지치지않는', '빛나는', '걸어가는', '에너제틱한', '스마트한'];
  const nouns = ['호랑이', '토끼', '치타', '펭귄', '거북이', '돼지', '고양이', '사자'];
  const randAdj = adjs[Math.floor(Math.random() * adjs.length)];
  const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randNum = Math.floor(Math.random() * 900) + 100;
  return `${randAdj}${randNoun}${randNum}`;
}

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseActive = true;
    console.log("🔥 Firebase initialized successfully!");
  } else {
    console.warn("⚠️ Firebase API Key가 설정되지 않았습니다. 로컬 Mock 모드로 동작합니다.");
  }
} catch (error) {
  console.error("Firebase initialization failed, falling back to Mock DB:", error);
}

// 로컬 Mock DB
const mockDB = {
  userStats: {
    todaySteps: 0,
    accumulatedSteps: 0,
    points: 100,
    // 만보(10,000보) 달성 일수 누적 — 캐릭터 레벨 기준
    dailyGoalAchievements: 0,
    // 오늘 만보 달성 여부 (하루 1회만 카운트)
    todayGoalAchieved: false,
    // 스토리 선택 테마 (랜덤 세팅)
    storyTheme: null,
    // 마지막 일일 초기화 날짜 (자정 리셋용)
    lastResetDate: '',
    // 하루 벌칙 방지 실드 상태
    shieldActive: false,
    // 스토리 전용 히든 엔딩 열쇠 개수
    storyKeys: 0,
    // 마지막 랜덤박스 구매일
    lastRandomBoxDate: '',
  },
  settings: {
    targetSteps: 10000,
    nickname: '',
    warningContacts: [],
    // 2인 연대책임 듀오 파트너 정보
    duoName: '',
    duoPhone: '',
  },
  storyHistory: [],
};

export async function getUserStats(userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) return docSnap.data();
      const defaultData = { ...mockDB.userStats };
      await setDoc(docRef, defaultData);
      return defaultData;
    } catch (e) {
      console.error("Firestore getUserStats error:", e);
      return { ...mockDB.userStats };
    }
  }
  return { ...mockDB.userStats };
}

export async function updateUserStats(stats, userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, stats, { merge: true });
      return true;
    } catch (e) {
      console.error("Firestore updateUserStats error:", e);
      return false;
    }
  }
  mockDB.userStats = { ...mockDB.userStats, ...stats };
  return true;
}

export async function getAppSettings(userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "settings", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.nickname) {
          const updatedSettings = { ...data, nickname: generateRandomNickname() };
          await setDoc(docRef, updatedSettings);
          return updatedSettings;
        }
        return data;
      }
      const defaultSettings = { 
        ...mockDB.settings, 
        nickname: generateRandomNickname() 
      };
      await setDoc(docRef, defaultSettings);
      return defaultSettings;
    } catch (e) {
      console.error("Firestore getAppSettings error:", e);
      return { ...mockDB.settings, nickname: generateRandomNickname() };
    }
  }
  if (!mockDB.settings.nickname) {
    mockDB.settings.nickname = generateRandomNickname();
  }
  return { ...mockDB.settings };
}

export async function saveAppSettings(settings, userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "settings", userId);
      await setDoc(docRef, settings, { merge: true });
      return true;
    } catch (e) {
      console.error("Firestore saveAppSettings error:", e);
      return false;
    }
  }
  mockDB.settings = { ...mockDB.settings, ...settings };
  return true;
}

export async function getStoryHistory(userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "stories", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) return docSnap.data().history || [];
      await setDoc(docRef, { history: [] });
      return [];
    } catch (e) {
      console.error("Firestore getStoryHistory error:", e);
      return [...mockDB.storyHistory];
    }
  }
  return [...mockDB.storyHistory];
}

export async function saveStoryHistory(history, userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "stories", userId);
      await setDoc(docRef, { history }, { merge: true });
      return true;
    } catch (e) {
      console.error("Firestore saveStoryHistory error:", e);
      return false;
    }
  }
  mockDB.storyHistory = history;
  return true;
}

export { isFirebaseActive, auth };
