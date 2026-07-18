import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, Alert, Image, Platform,
} from 'react-native';
import { checkPedometerAvailability, startStepCountSubscription, getStepCountRange } from '../services/pedometer';
import { getUserStats, updateUserStats, getAppSettings } from '../services/firebase';
import { sendRandomWarningSMS } from '../services/smsAlert';

// 캐릭터 레벨별 일러스트 (static require 필수)
const CHAR_IMAGES = [
  require('../assets/char_level0.png'),
  require('../assets/char_level1.png'),
  require('../assets/char_level2.png'),
  require('../assets/char_level3.png'),
];

function getCharacterInfo(dailyGoalAchievements, nickname) {
  const n = nickname || '핑키';
  if (dailyGoalAchievements >= 100) {
    return { level: 3, name: `존예${n}`, desc: '완벽한 몸과 빛나는 아우라 — 이제 신의 경지', nextThreshold: null, progress: 1 };
  }
  if (dailyGoalAchievements >= 30) {
    return { level: 2, name: `운동왕${n}`, desc: '근육이 터질 것 같은 운동 마니아', nextThreshold: 100, progress: (dailyGoalAchievements - 30) / 70 };
  }
  if (dailyGoalAchievements >= 10) {
    return { level: 1, name: `인간${n}`, desc: '드디어 두 발로 걷기 시작한 진화형', nextThreshold: 30, progress: (dailyGoalAchievements - 10) / 20 };
  }
  return { level: 0, name: `돼지${n}`, desc: '침대와 과자가 전부였던 게으름의 상징', nextThreshold: 10, progress: dailyGoalAchievements / 10 };
}

export default function HomeScreen() {
  const [steps, setSteps] = useState(0);
  const [accumulatedSteps, setAccumulatedSteps] = useState(0);
  const [targetSteps, setTargetSteps] = useState(10000);
  const [points, setPoints] = useState(100);
  const [nickname, setNickname] = useState('핑키');
  const [dailyGoalAchievements, setDailyGoalAchievements] = useState(0);
  const [todayGoalAchieved, setTodayGoalAchieved] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 실수 방지용 refs
  const baseStepsRef = useRef(0);       // 구독 시작 시점 건강 앱 걸음수
  const lastTotalRef = useRef(0);        // 마지막 총 걸음수 (델타 계산용)
  const pedometerSub = useRef(null);
  const goalAlertShownRef = useRef(false);
  const accRef = useRef(0);             // accumulated 최신값 (closure 방지)
  const pointsRef = useRef(100);

  // --- 초기화 ---
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 1. Firebase / Mock에서 저장값 로드
      const [stats, settings] = await Promise.all([getUserStats(), getAppSettings()]);

      if (!mounted) return;

      const savedNickname = settings.nickname || '핑키';
      const savedTarget = settings.targetSteps || 10000;
      const savedContacts = settings.warningContacts || [];
      const savedPoints = stats.points || 100;
      const savedAchievements = stats.dailyGoalAchievements || 0;
      const savedAcc = stats.accumulatedSteps || 0;

      setNickname(savedNickname);
      setTargetSteps(savedTarget);
      setContacts(savedContacts);
      setPoints(savedPoints);
      setDailyGoalAchievements(savedAchievements);
      pointsRef.current = savedPoints;
      accRef.current = savedAcc;

      // 2. 자정 리셋 처리
      const today = new Date().toDateString();
      let todaySteps = stats.todaySteps || 0;
      let todayAchieved = stats.todayGoalAchieved || false;

      if ((stats.lastResetDate || '') !== today) {
        todaySteps = 0;
        todayAchieved = false;
        goalAlertShownRef.current = false;
        await updateUserStats({ todaySteps: 0, todayGoalAchieved: false, lastResetDate: today });
      }

      setTodayGoalAchieved(todayAchieved);
      setAccumulatedSteps(savedAcc);
      if (todayAchieved) goalAlertShownRef.current = true;

      // 3. 만보기 권한 확인 & 실제 데이터 로드
      const available = await checkPedometerAvailability();
      if (!mounted) return;
      setIsPedometerAvailable(available);

      if (available) {
        // iOS HealthKit / Android 기록에서 오늘 자정부터 지금까지 걸음수 가져오기
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const healthSteps = await getStepCountRange(startOfDay, new Date());
        if (!mounted) return;

        baseStepsRef.current = healthSteps;
        lastTotalRef.current = healthSteps;

        // 저장값과 차이가 있으면 accumulated 보정
        const delta = healthSteps - todaySteps;
        const newAcc = Math.max(0, savedAcc + delta);
        accRef.current = newAcc;
        setSteps(healthSteps);
        setAccumulatedSteps(newAcc);
        if (delta !== 0) {
          await updateUserStats({ todaySteps: healthSteps, accumulatedSteps: newAcc });
        }

        // 실시간 구독 시작 (watchStepCount는 구독 이후 누적 걸음 전달)
        pedometerSub.current = startStepCountSubscription((stepsFromSub) => {
          const total = baseStepsRef.current + stepsFromSub;
          const d = total - lastTotalRef.current;
          if (d > 0) {
            lastTotalRef.current = total;
            const newAcc2 = accRef.current + d;
            accRef.current = newAcc2;
            setSteps(total);
            setAccumulatedSteps(newAcc2);
            updateUserStats({ todaySteps: total, accumulatedSteps: newAcc2 });
          }
        });
      } else {
        // 웹/시뮬레이터: 저장된 값 사용
        setSteps(todaySteps);
        lastTotalRef.current = todaySteps;
        setAccumulatedSteps(savedAcc);
      }

      setIsLoading(false);
    };

    init();
    return () => {
      mounted = false;
      if (pedometerSub.current) pedometerSub.current.remove();
    };
  }, []);

  // --- 만보 달성 자동 감지 ---
  useEffect(() => {
    if (
      !goalAlertShownRef.current &&
      isPedometerAvailable &&
      !todayGoalAchieved &&
      steps >= targetSteps &&
      !isLoading
    ) {
      goalAlertShownRef.current = true;
      Alert.alert(
        '🎉 만보 달성!',
        `${targetSteps.toLocaleString()}보를 달성했습니다!\n달성 기록을 남길까요?`,
        [
          { text: '나중에', style: 'cancel' },
          { text: '✅ 기록하기', onPress: handleDailyGoalAchieved },
        ]
      );
    }
  }, [steps, targetSteps, isPedometerAvailable, todayGoalAchieved, isLoading]);

  // --- 만보 달성 기록 (하루 1회) ---
  const handleDailyGoalAchieved = useCallback(async () => {
    if (todayGoalAchieved) {
      Alert.alert('이미 달성!', '오늘 만보 달성은 이미 기록됐습니다. 내일 또 도전하세요!');
      return;
    }
    const nextDays = dailyGoalAchievements + 1;
    const nextPoints = pointsRef.current + 100;
    pointsRef.current = nextPoints;

    const prevChar = getCharacterInfo(dailyGoalAchievements, nickname);
    const nextChar = getCharacterInfo(nextDays, nickname);

    setDailyGoalAchievements(nextDays);
    setTodayGoalAchieved(true);
    setPoints(nextPoints);
    await updateUserStats({ dailyGoalAchievements: nextDays, todayGoalAchieved: true, points: nextPoints });

    if (nextChar.level > prevChar.level) {
      Alert.alert('🚀 레벨업!', `'${prevChar.name}' → '${nextChar.name}'\n으로 진화했습니다!`);
    } else {
      Alert.alert('✅ 만보 달성!', `누적 달성일: ${nextDays}일 (+100P)`);
    }
  }, [dailyGoalAchievements, todayGoalAchieved, nickname]);

  // --- 시뮬레이터용 수동 걸음 추가 ---
  const handleAddManualSteps = async (amount) => {
    const nextSteps = steps + amount;
    const prevMilestone = Math.floor(accumulatedSteps / 1000);
    const nextAcc = accumulatedSteps + amount;
    const nextMilestone = Math.floor(nextAcc / 1000);

    let bonus = 0;
    if (nextMilestone > prevMilestone) {
      bonus = (nextMilestone - prevMilestone) * 50;
      Alert.alert('🎉 걸음 마일스톤!', `${nextMilestone * 1000}보 돌파! +${bonus}P`);
    }
    const nextPoints = points + bonus;
    accRef.current = nextAcc;
    lastTotalRef.current = nextSteps;
    setSteps(nextSteps);
    setAccumulatedSteps(nextAcc);
    setPoints(nextPoints);
    pointsRef.current = nextPoints;
    await updateUserStats({ todaySteps: nextSteps, accumulatedSteps: nextAcc, points: nextPoints });
  };

  // --- 경고 문자 발송 ---
  const handleWarningSMS = async () => {
    if (steps >= targetSteps) {
      Alert.alert('🏆 목표 달성!', `오늘 ${targetSteps.toLocaleString()}보를 이미 달성했어요!`);
      return;
    }
    if (contacts.length === 0) {
      Alert.alert('연락처 없음', '설정 탭에서 경고 연락처를 먼저 등록해주세요.');
      return;
    }
    Alert.alert(
      '🚨 경고 문자 발송',
      `오늘 ${steps.toLocaleString()}보 달성 (목표 ${targetSteps.toLocaleString()}보).\n연락처 중 1명에게 경고 문자를 보냅니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '문자 보내기',
          onPress: async () => {
            // contacts는 {name, phone} 객체 배열 → 전화번호만 추출
            const phoneNumbers = contacts.map(c => (typeof c === 'string' ? c : c.phone));
            const success = await sendRandomWarningSMS(phoneNumbers);
            if (success) {
              const penalty = Math.max(0, pointsRef.current - 20);
              pointsRef.current = penalty;
              setPoints(penalty);
              await updateUserStats({ points: penalty });
            }
          },
        },
      ]
    );
  };

  const charInfo = getCharacterInfo(dailyGoalAchievements, nickname);
  const progressPct = Math.min(100, charInfo.progress * 100);
  const todayPct = Math.min(100, (steps / targetSteps) * 100);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.logo}>🏃 핑키 피트니스</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>⚡ {points} P</Text>
        </View>
      </View>

      {/* 오늘 걸음수 서클 */}
      <View style={styles.stepCircleWrap}>
        <View style={[styles.stepCircle, steps >= targetSteps && styles.stepCircleAchieved]}>
          <Text style={styles.stepNum}>{steps.toLocaleString()}</Text>
          <Text style={styles.stepGoal}>/ {targetSteps.toLocaleString()} 걸음</Text>
          {steps >= targetSteps && <Text style={styles.stepAchievedBadge}>🎉 달성!</Text>}
        </View>
        {/* 진행 바 */}
        <View style={styles.todayProgressBg}>
          <View style={[styles.todayProgressFill, { width: `${todayPct}%` }, steps >= targetSteps && styles.todayProgressDone]} />
        </View>
        <Text style={styles.sensorStatus}>
          {isPedometerAvailable ? '🟢 만보기 실시간 측정 중' : '🟡 시뮬레이터 모드 (웹/에뮬레이터)'}
        </Text>
      </View>

      {/* 캐릭터 카드 */}
      <View style={styles.charCard}>
        <Image source={CHAR_IMAGES[charInfo.level]} style={styles.charImage} resizeMode="contain" />
        <Text style={styles.charName}>{charInfo.name}</Text>
        <Text style={styles.charDesc}>{charInfo.desc}</Text>

        <View style={styles.achieveRow}>
          <Text style={styles.achieveLabel}>만보 달성일</Text>
          <Text style={styles.achieveCount}>{dailyGoalAchievements}일</Text>
        </View>

        {charInfo.nextThreshold ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>현재 {dailyGoalAchievements}일</Text>
              <Text style={styles.progressLabel}>다음 레벨 {charInfo.nextThreshold}일</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.maxLevelText}>✨ 최고 레벨 달성! ✨</Text>
        )}
      </View>

      {/* 액션 패널 */}
      <View style={styles.panel}>

        {/* 실제 만보기 사용 중일 때: 만보 달성 버튼 + 경고 문자 */}
        {isPedometerAvailable ? (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.greenBtn, todayGoalAchieved && styles.disabledBtn]}
              onPress={handleDailyGoalAchieved}
            >
              <Text style={styles.btnText}>
                {todayGoalAchieved ? '✅ 오늘 만보 달성 완료' : '🏅 만보 달성 기록하기 (+100P)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.redBtn]} onPress={handleWarningSMS}>
              <Text style={styles.btnText}>🚨 목표 미달성 경고 문자 보내기</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* 시뮬레이터/웹 모드: 수동 컨트롤 */
          <>
            <Text style={styles.panelTitle}>⚡ 시뮬레이터 컨트롤 (웹 전용)</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, styles.blueBtn]} onPress={() => handleAddManualSteps(500)}>
                <Text style={styles.btnText}>+500보</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.blueBtn]} onPress={() => handleAddManualSteps(3000)}>
                <Text style={styles.btnText}>+3,000보</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.greenBtn, todayGoalAchieved && styles.disabledBtn]}
              onPress={handleDailyGoalAchieved}
            >
              <Text style={styles.btnText}>
                {todayGoalAchieved ? '✅ 오늘 만보 달성 완료' : '🏅 오늘 만보 달성! (+100P)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.redBtn]} onPress={handleWarningSMS}>
              <Text style={styles.btnText}>🚨 경고 문자 시뮬레이션</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  header: {
    flexDirection: 'row', width: '100%',
    justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, marginTop: 10,
  },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#343A40' },
  pointBadge: { backgroundColor: '#FFE3E3', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  pointText: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 14 },

  stepCircleWrap: { alignItems: 'center', marginBottom: 24, width: '100%' },
  stepCircle: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#FFFFFF', borderWidth: 8, borderColor: '#FF8787',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 4, marginBottom: 14,
  },
  stepCircleAchieved: { borderColor: '#51CF66' },
  stepNum: { fontSize: 36, fontWeight: 'bold', color: '#212529' },
  stepGoal: { fontSize: 13, color: '#868E96', marginTop: 4 },
  stepAchievedBadge: { fontSize: 13, color: '#37B24D', fontWeight: 'bold', marginTop: 4 },
  todayProgressBg: { width: '80%', height: 8, backgroundColor: '#F1F3F5', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  todayProgressFill: { height: '100%', backgroundColor: '#FF8787', borderRadius: 4 },
  todayProgressDone: { backgroundColor: '#51CF66' },
  sensorStatus: { fontSize: 12, color: '#868E96' },

  charCard: {
    width: '100%', backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 24, alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  charImage: { width: 160, height: 160, marginBottom: 12 },
  charName: { fontSize: 22, fontWeight: 'bold', color: '#343A40', marginBottom: 4 },
  charDesc: { fontSize: 13, color: '#868E96', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  achieveRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', backgroundColor: '#FFF5F5', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, marginBottom: 14,
  },
  achieveLabel: { fontSize: 13, color: '#868E96', fontWeight: '600' },
  achieveCount: { fontSize: 18, fontWeight: 'bold', color: '#FF6B6B' },
  progressWrap: { width: '100%' },
  progressBg: { width: '100%', height: 10, backgroundColor: '#F1F3F5', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF8787', borderRadius: 5 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabel: { fontSize: 11, color: '#868E96' },
  maxLevelText: { fontSize: 15, fontWeight: 'bold', color: '#FF8787', marginTop: 4 },

  panel: { width: '100%', backgroundColor: '#F1F3F5', borderRadius: 16, padding: 16, alignItems: 'center' },
  panelTitle: { fontSize: 14, fontWeight: 'bold', color: '#495057', marginBottom: 12 },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10, gap: 10 },
  btn: {
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    height: 46, paddingHorizontal: 12, width: '100%', marginBottom: 10,
  },
  blueBtn: { flex: 1, width: undefined, marginBottom: 0, backgroundColor: '#4DABF7' },
  greenBtn: { backgroundColor: '#51CF66' },
  redBtn: { backgroundColor: '#FA5252', marginBottom: 0 },
  disabledBtn: { backgroundColor: '#ADB5BD' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
});
