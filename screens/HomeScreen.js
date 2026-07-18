import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, Alert, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { checkPedometerAvailability, startStepCountSubscription, getStepCountRange } from '../services/pedometer';
import { getUserStats, updateUserStats, getAppSettings } from '../services/firebase';
import { sendRandomWarningSMS } from '../services/smsAlert';

const CHAR_IMAGES = [
  require('../assets/char_level0.png'),
  require('../assets/char_level1.png'),
  require('../assets/char_level2.png'),
  require('../assets/char_level3.png'),
];

function getCharacterInfo(days, nickname) {
  const n = nickname || '핑키';
  if (days >= 100) return { level: 3, name: `존예${n}`,   desc: '완벽한 몸과 빛나는 아우라 — 이제 신의 경지',       nextThreshold: null, progress: 1 };
  if (days >= 30)  return { level: 2, name: `운동왕${n}`, desc: '근육이 터질 것 같은 운동 마니아',                   nextThreshold: 100,  progress: (days - 30) / 70 };
  if (days >= 10)  return { level: 1, name: `인간${n}`,   desc: '드디어 두 발로 걷기 시작한 진화형',               nextThreshold: 30,   progress: (days - 10) / 20 };
  return             { level: 0, name: `돼지${n}`,   desc: '침대와 과자가 전부였던 게으름의 상징',           nextThreshold: 10,   progress: days / 10 };
}

const LEVEL_COLORS = [
  ['#FFCDD2', '#FF8787'],
  ['#BBDEFB', '#42A5F5'],
  ['#C8E6C9', '#43A047'],
  ['#F3E5F5', '#AB47BC'],
];

export default function HomeScreen() {
  const [steps, setSteps]                           = useState(0);
  const [accumulatedSteps, setAccumulatedSteps]     = useState(0);
  const [targetSteps, setTargetSteps]               = useState(10000);
  const [points, setPoints]                         = useState(100);
  const [nickname, setNickname]                     = useState('핑키');
  const [dailyGoalAchievements, setDailyGoalAchievements] = useState(0);
  const [todayGoalAchieved, setTodayGoalAchieved]   = useState(false);
  const [contacts, setContacts]                     = useState([]);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [isLoading, setIsLoading]                   = useState(true);

  const baseStepsRef      = useRef(0);
  const lastTotalRef      = useRef(0);
  const pedometerSub      = useRef(null);
  const goalAlertShownRef = useRef(false);
  const accRef            = useRef(0);
  const pointsRef         = useRef(100);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const [stats, settings] = await Promise.all([getUserStats(), getAppSettings()]);
      if (!mounted) return;

      const savedNickname  = settings.nickname       || '핑키';
      const savedTarget    = settings.targetSteps    || 10000;
      const savedContacts  = settings.warningContacts || [];
      const savedPoints    = stats.points            || 100;
      const savedAchieve   = stats.dailyGoalAchievements || 0;
      const savedAcc       = stats.accumulatedSteps  || 0;

      setNickname(savedNickname);
      setTargetSteps(savedTarget);
      setContacts(savedContacts);
      setPoints(savedPoints);
      setDailyGoalAchievements(savedAchieve);
      pointsRef.current = savedPoints;
      accRef.current    = savedAcc;

      const today = new Date().toDateString();
      let todaySteps   = stats.todaySteps       || 0;
      let todayAchieved = stats.todayGoalAchieved || false;

      if ((stats.lastResetDate || '') !== today) {
        todaySteps    = 0;
        todayAchieved = false;
        goalAlertShownRef.current = false;
        await updateUserStats({ todaySteps: 0, todayGoalAchieved: false, lastResetDate: today });
      }

      setTodayGoalAchieved(todayAchieved);
      setAccumulatedSteps(savedAcc);
      if (todayAchieved) goalAlertShownRef.current = true;

      const available = await checkPedometerAvailability();
      if (!mounted) return;
      setIsPedometerAvailable(available);

      if (available) {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const healthSteps = await getStepCountRange(startOfDay, new Date());
        if (!mounted) return;

        baseStepsRef.current = healthSteps;
        lastTotalRef.current = healthSteps;
        const delta  = healthSteps - todaySteps;
        const newAcc = Math.max(0, savedAcc + delta);
        accRef.current = newAcc;
        setSteps(healthSteps);
        setAccumulatedSteps(newAcc);
        if (delta !== 0) await updateUserStats({ todaySteps: healthSteps, accumulatedSteps: newAcc });

        pedometerSub.current = startStepCountSubscription((stepsFromSub) => {
          const total = baseStepsRef.current + stepsFromSub;
          const d     = total - lastTotalRef.current;
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

  useEffect(() => {
    if (!goalAlertShownRef.current && isPedometerAvailable && !todayGoalAchieved && steps >= targetSteps && !isLoading) {
      goalAlertShownRef.current = true;
      Alert.alert('🎉 만보 달성!', `${targetSteps.toLocaleString()}보 달성!\n달성 기록을 남길까요?`, [
        { text: '나중에', style: 'cancel' },
        { text: '✅ 기록하기', onPress: handleDailyGoalAchieved },
      ]);
    }
  }, [steps, targetSteps, isPedometerAvailable, todayGoalAchieved, isLoading]);

  const handleDailyGoalAchieved = useCallback(async () => {
    if (todayGoalAchieved) { Alert.alert('이미 달성!', '내일 또 도전하세요!'); return; }
    const nextDays   = dailyGoalAchievements + 1;
    const nextPoints = pointsRef.current + 100;
    pointsRef.current = nextPoints;
    const prevChar = getCharacterInfo(dailyGoalAchievements, nickname);
    const nextChar = getCharacterInfo(nextDays, nickname);
    setDailyGoalAchievements(nextDays);
    setTodayGoalAchieved(true);
    setPoints(nextPoints);
    await updateUserStats({ dailyGoalAchievements: nextDays, todayGoalAchieved: true, points: nextPoints });
    if (nextChar.level > prevChar.level)
      Alert.alert('🚀 레벨업!', `'${prevChar.name}' → '${nextChar.name}'\n으로 진화했습니다!`);
    else
      Alert.alert('✅ 만보 달성!', `누적 달성일: ${nextDays}일 (+100P)`);
  }, [dailyGoalAchievements, todayGoalAchieved, nickname]);

  const handleAddManualSteps = async (amount) => {
    const nextSteps = steps + amount;
    const prevMile  = Math.floor(accumulatedSteps / 1000);
    const nextAcc   = accumulatedSteps + amount;
    const nextMile  = Math.floor(nextAcc / 1000);
    let bonus = 0;
    if (nextMile > prevMile) {
      bonus = (nextMile - prevMile) * 50;
      Alert.alert('🎉 마일스톤!', `${nextMile * 1000}보 돌파! +${bonus}P`);
    }
    const nextPoints = points + bonus;
    accRef.current = nextAcc;
    lastTotalRef.current = nextSteps;
    setSteps(nextSteps); setAccumulatedSteps(nextAcc); setPoints(nextPoints); pointsRef.current = nextPoints;
    await updateUserStats({ todaySteps: nextSteps, accumulatedSteps: nextAcc, points: nextPoints });
  };

  const handleWarningSMS = async () => {
    if (steps >= targetSteps) { Alert.alert('🏆 이미 달성!', '오늘 목표를 달성했어요!'); return; }
    if (contacts.length === 0) { Alert.alert('연락처 없음', '설정 탭에서 경고 연락처를 등록해주세요.'); return; }
    Alert.alert('🚨 경고 문자 발송', `오늘 ${steps.toLocaleString()}보 / 목표 ${targetSteps.toLocaleString()}보\n연락처 1명에게 경고 문자를 보냅니다.`,
      [{ text: '취소', style: 'cancel' }, {
        text: '보내기', onPress: async () => {
          const phones = contacts.map(c => typeof c === 'string' ? c : c.phone).filter(Boolean);
          const ok = await sendRandomWarningSMS(phones);
          if (ok) {
            const p = Math.max(0, pointsRef.current - 20);
            pointsRef.current = p; setPoints(p);
            await updateUserStats({ points: p });
          }
        }
      }]
    );
  };

  const charInfo   = getCharacterInfo(dailyGoalAchievements, nickname);
  const todayPct   = Math.min(100, Math.floor((steps / targetSteps) * 100));
  const progressPct = Math.min(100, charInfo.progress * 100);
  const achieved   = steps >= targetSteps;
  const ringColor  = achieved ? '#22C55E' : '#FF4D80';
  const lvlColors  = LEVEL_COLORS[charInfo.level];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── 헤더 ─── */}
      <LinearGradient colors={['#FF4D80', '#FF8FB1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <Text style={styles.logo}>🏃 핑키 피트니스</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>⚡ {points} P</Text>
        </View>
      </LinearGradient>

      {/* ─── 걸음수 링 ─── */}
      <View style={styles.ringSection}>
        <View style={[styles.ringOuter, { borderColor: ringColor, shadowColor: ringColor }]}>
          <Text style={[styles.ringNum, achieved && styles.ringNumGreen]}>{steps.toLocaleString()}</Text>
          <Text style={styles.ringGoal}>/ {targetSteps.toLocaleString()} 걸음</Text>
          <Text style={[styles.ringPct, achieved ? styles.ringPctGreen : styles.ringPctPink]}>
            {achieved ? '🎉 달성!' : `${todayPct}%`}
          </Text>
        </View>

        {/* 선형 진행 바 */}
        <View style={styles.barBg}>
          <LinearGradient
            colors={achieved ? ['#22C55E', '#16A34A'] : ['#FF4D80', '#FF8FB1']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.barFill, { width: `${todayPct}%` }]}
          />
        </View>

        <Text style={styles.sensorBadge}>
          {isPedometerAvailable ? '🟢 만보기 실시간 측정 중' : '🟡 시뮬레이터 모드'}
        </Text>
      </View>

      {/* ─── 캐릭터 카드 ─── */}
      <View style={styles.charCard}>
        {/* 레벨 배지 */}
        <LinearGradient colors={[lvlColors[0], lvlColors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Lv.{charInfo.level} · 만보 달성 {dailyGoalAchievements}일</Text>
        </LinearGradient>

        <Image source={CHAR_IMAGES[charInfo.level]} style={styles.charImage} resizeMode="contain" />
        <Text style={styles.charName}>{charInfo.name}</Text>
        <Text style={styles.charDesc}>{charInfo.desc}</Text>

        {/* XP 바 */}
        {charInfo.nextThreshold ? (
          <View style={styles.xpWrap}>
            <View style={styles.xpBg}>
              <LinearGradient
                colors={[lvlColors[0], lvlColors[1]]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.xpFill, { width: `${progressPct}%` }]}
              />
            </View>
            <View style={styles.xpLabels}>
              <Text style={styles.xpLabel}>{dailyGoalAchievements}일</Text>
              <Text style={styles.xpLabel}>→ {charInfo.nextThreshold}일</Text>
            </View>
          </View>
        ) : (
          <View style={styles.maxTag}><Text style={styles.maxTagText}>✨ MAX LEVEL ✨</Text></View>
        )}
      </View>

      {/* ─── 액션 버튼 ─── */}
      <View style={styles.actions}>
        {isPedometerAvailable ? (
          <>
            {todayGoalAchieved ? (
              <View style={[styles.btn, styles.btnDone]}>
                <Text style={styles.btnText}>✅ 오늘 만보 달성 완료</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleDailyGoalAchieved} activeOpacity={0.85}>
                <LinearGradient colors={['#22C55E', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  <Text style={styles.btnText}>🏅 만보 달성 기록하기  +100P</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleWarningSMS} activeOpacity={0.85} style={{ marginTop: 10 }}>
              <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                <Text style={styles.btnText}>🚨 목표 미달성 경고 문자</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.simLabel}>⚡ 시뮬레이터 컨트롤</Text>
            <View style={styles.simRow}>
              <TouchableOpacity onPress={() => handleAddManualSteps(500)} activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient colors={['#60A5FA', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.simBtn}>
                  <Text style={styles.btnText}>+500보</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddManualSteps(3000)} activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient colors={['#60A5FA', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.simBtn}>
                  <Text style={styles.btnText}>+3,000보</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {todayGoalAchieved ? (
              <View style={[styles.btn, styles.btnDone]}><Text style={styles.btnText}>✅ 오늘 만보 달성 완료</Text></View>
            ) : (
              <TouchableOpacity onPress={handleDailyGoalAchieved} activeOpacity={0.85}>
                <LinearGradient colors={['#22C55E', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  <Text style={styles.btnText}>🏅 만보 달성!  +100P</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleWarningSMS} activeOpacity={0.85} style={{ marginTop: 10 }}>
              <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                <Text style={styles.btnText}>🚨 경고 문자 시뮬레이션</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FAFAFC' },
  container: { paddingBottom: 120 },

  /* 헤더 */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 42,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  logo: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.4 },
  pointBadge: { backgroundColor: 'rgba(255,255,255,0.22)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  pointText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  /* 링 섹션 */
  ringSection: {
    marginHorizontal: 16,
    marginTop: -24,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: '#FF4D80',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#FFF0F3',
  },
  ringOuter: {
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 12, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FF4D80', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 4 },
    elevation: 8, marginBottom: 18,
  },
  ringNum:      { fontSize: 44, fontWeight: '900', color: '#1C1C28', letterSpacing: -1 },
  ringNumGreen: { color: '#16A34A' },
  ringGoal:     { fontSize: 12, color: '#A0A0B0', marginTop: 2, fontWeight: '500' },
  ringPct:      { fontSize: 15, fontWeight: '800', marginTop: 6 },
  ringPctPink:  { color: '#FF4D80' },
  ringPctGreen: { color: '#16A34A' },
  barBg: { width: '82%', height: 8, backgroundColor: '#FFEBF0', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 4 },
  sensorBadge: { fontSize: 11, color: '#A4A4B4', fontWeight: '600' },

  /* 캐릭터 카드 */
  charCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF4D80',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#FFF0F3',
  },
  levelBadge: { width: '100%', paddingVertical: 10, alignItems: 'center' },
  levelBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  charImage: { width: 160, height: 160, marginTop: 20 },
  charName: { fontSize: 26, fontWeight: '900', color: '#1C1C28', marginTop: 10, letterSpacing: -0.6 },
  charDesc: { fontSize: 13, color: '#8A8A9A', textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20, paddingHorizontal: 24, fontWeight: '500' },
  xpWrap: { width: '100%', paddingHorizontal: 24, paddingBottom: 22 },
  xpBg: { width: '100%', height: 10, backgroundColor: '#F0F0F4', borderRadius: 5, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 5 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  xpLabel: { fontSize: 11, color: '#A4A4B4', fontWeight: '700' },
  maxTag: { marginBottom: 22, backgroundColor: '#FFF0F3', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 12 },
  maxTagText: { fontSize: 13, fontWeight: '800', color: '#FF4D80' },

  /* 액션 */
  actions: { marginHorizontal: 16, marginBottom: 8 },
  btn: {
    borderRadius: 18, height: 54, alignItems: 'center', justifyContent: 'center', width: '100%',
    shadowColor: '#FF4D80', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  btnDone: { backgroundColor: '#D1FAE5', marginBottom: 0 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  simLabel: { fontSize: 13, fontWeight: '800', color: '#A4A4B4', textAlign: 'center', marginBottom: 12, letterSpacing: 0.5 },
  simRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  simBtn: { borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
});
