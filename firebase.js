import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase 설정 템플릿
// 사용자가 환경변수(EXPO_PUBLIC_FIREBASE_...)에 키를 등록하면 활성화됩니다.
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
let isFirebaseActive = false;

// Firebase 초기화 시도
try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log("🔥 Firebase initialized successfully!");
  } else {
    console.warn("⚠️ Firebase API Key가 설정되지 않았습니다. 로컬 Mock 모드로 동작합니다.");
  }
} catch (error) {
  console.error("Firebase initialization failed, falling back to Mock DB:", error);
}

// Firebase 미연동 시 사용할 로컬 메모리 Mock DB
const mockDB = {
  userStats: {
    todaySteps: 0,
    accumulatedSteps: 0,
    points: 100, // 기본 100포인트 증정 (테스트용)
    characterLevel: 0, // 0: 아기돼지, 1: 사춘기돼지, 2: 헬창돼지
  },
  settings: {
    targetSteps: 5000,
    warningContacts: [], // ['010-1234-5678', '010-9876-5432']
  },
  storyHistory: [
    {
      id: "1",
      step: 0,
      content: "당신은 게으른 아기 아기돼지 핑키입니다. 매일 침대에 누워 과자를 먹는 것이 유일한 낙입니다. 어느 날, 거울 속의 뚱뚱한 자신을 보고 충격을 받았습니다. '나도... 멋진 돼지가 될 수 있을까?' 핑키는 첫걸음을 떼기로 결심했습니다.",
      selectedOption: null
    }
  ]
};

/**
 * 사용자의 운동 스탯을 조회합니다.
 */
export async function getUserStats(userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // 기본값 저장 후 반환
        const defaultData = mockDB.userStats;
        await setDoc(docRef, defaultData);
        return defaultData;
      }
    } catch (e) {
      console.error("Firestore getUserStats error:", e);
      return mockDB.userStats;
    }
  }
  return mockDB.userStats;
}

/**
 * 사용자의 운동 스탯을 업데이트합니다.
 */
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

/**
 * 앱 설정을 가져옵니다 (목표 걸음수, 경고 연락처).
 */
export async function getAppSettings(userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "settings", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        const defaultSettings = mockDB.settings;
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
      }
    } catch (e) {
      console.error("Firestore getAppSettings error:", e);
      return mockDB.settings;
    }
  }
  return mockDB.settings;
}

/**
 * 앱 설정을 업데이트합니다.
 */
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

/**
 * 진행된 스토리 이력을 가져옵니다.
 */
export async function getStoryHistory(userId = "default_user") {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, "stories", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().history || [];
      } else {
        const defaultHistory = mockDB.storyHistory;
        await setDoc(docRef, { history: defaultHistory });
        return defaultHistory;
      }
    } catch (e) {
      console.error("Firestore getStoryHistory error:", e);
      return mockDB.storyHistory;
    }
  }
  return mockDB.storyHistory;
}

/**
 * 진행된 스토리 이력을 업데이트합니다.
 */
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

export { isFirebaseActive };
