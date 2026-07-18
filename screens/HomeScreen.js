import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, Alert, Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { checkPedometerAvailability, startStepCountSubscription, getStepCountRange } from '../services/pedometer';
import { getUserStats, updateUserStats, getAppSettings } from '../services/firebase';
import { sendRandomWarningSMS } from '../services/smsAlert';
import { Accelerometer } from 'expo-sensors';
import { generateAIPenaltySMS } from '../services/aiStory';

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

export default function HomeScreen({ userId = "default_user" }) {
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

  // 포인트 상점, 듀오 챌린지 및 꼼수 방지 관련 상태
  const [isGeneratingSMS, setIsGeneratingSMS]       = useState(false);
  const [cheatAlertVisible, setCheatAlertVisible]   = useState(false);
  const [duoName, setDuoName]                       = useState('');
  const [duoPhone, setDuoPhone]                     = useState('');
  const [duoSteps, setDuoSteps]                     = useState(0);
  const [shieldActive, setShieldActive]             = useState(false);

  const baseStepsRef      = useRef(0);
  const lastTotalRef      = useRef(0);
  const pedometerSub      = useRef(null);
  const goalAlertShownRef = useRef(false);
  const accRef            = useRef(0);
  const pointsRef         = useRef(100);
  const isCheatingRef      = useRef(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const [stats, settings] = await Promise.all([getUserStats(userId), getAppSettings(userId)]);
      if (!mounted) return;

      const savedNickname  = settings.nickname       || '핑키';
      const savedTarget    = settings.targetSteps    || 10000;
      const savedContacts  = settings.warningContacts || [];
      const savedPoints    = stats.points            || 100;
      const savedAchieve   = stats.dailyGoalAchievements || 0;
      const savedAcc       = stats.accumulatedSteps  || 0;
      const savedDuoName   = settings.duoName        || '';
      const savedDuoPhone  = settings.duoPhone       || '';
      const savedShield    = stats.shieldActive      || false;

      setNickname(savedNickname);
      setTargetSteps(savedTarget);
      setContacts(savedContacts);
      setPoints(savedPoints);
      setDailyGoalAchievements(savedAchieve);
      setDuoName(savedDuoName);
      setDuoPhone(savedDuoPhone);
      setShieldActive(savedShield);
      pointsRef.current = savedPoints;
      accRef.current    = savedAcc;

      const today = new Date().toDateString();
      let todaySteps   = stats.todaySteps       || 0;
      let todayAchieved = stats.todayGoalAchieved || false;

      if ((stats.lastResetDate || '') !== today) {
        todaySteps    = 0;
        todayAchieved = false;
        goalAlertShownRef.current = false;
        // 하루가 지나면 실드도 같이 자동 리셋 처리
        await updateUserStats({ todaySteps: 0, todayGoalAchieved: false, lastResetDate: today, shieldActive: false }, userId);
        setShieldActive(false);
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
        if (delta !== 0) await updateUserStats({ todaySteps: healthSteps, accumulatedSteps: newAcc }, userId);

        pedometerSub.current = startStepCountSubscription((stepsFromSub) => {
          if (isCheatingRef.current) return; // 꼼수 작동 시 걸음수 업데이트 차단
          const total = baseStepsRef.current + stepsFromSub;
          const d     = total - lastTotalRef.current;
          if (d > 0) {
            lastTotalRef.current = total;
            const newAcc2 = accRef.current + d;
            accRef.current = newAcc2;
            setSteps(total);
            setAccumulatedSteps(newAcc2);
            updateUserStats({ todaySteps: total, accumulatedSteps: newAcc2 }, userId);
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
    await updateUserStats({ dailyGoalAchievements: nextDays, todayGoalAchieved: true, points: nextPoints }, userId);
    if (nextChar.level > prevChar.level)
      Alert.alert('🚀 레벨업!', `'${prevChar.name}' → '${nextChar.name}'\n으로 진화했습니다!`);
    else
      Alert.alert('✅ 만보 달성!', `누적 달성일: ${nextDays}일 (+100P)`);
  }, [dailyGoalAchievements, todayGoalAchieved, nickname]);

  const handleDemoAddAchievement = async () => {
    const nextDays   = dailyGoalAchievements + 1;
    const nextPoints = points + 100;
    pointsRef.current = nextPoints;
    const prevChar = getCharacterInfo(dailyGoalAchievements, nickname);
    const nextChar = getCharacterInfo(nextDays, nickname);
    setDailyGoalAchievements(nextDays);
    setPoints(nextPoints);
    await updateUserStats({ dailyGoalAchievements: nextDays, points: nextPoints }, userId);
    if (nextChar.level > prevChar.level)
      Alert.alert('🚀 레벨업!', `'${prevChar.name}' → '${nextChar.name}'\n으로 진화했습니다! (시연용 추가)`);
    else
      Alert.alert('✅ 달성일수 추가 완료', `누적 달성일: ${nextDays}일 (+100P)`);
  };

  // 꼼수 감지용 자이로 센서 등록
  useEffect(() => {
    let shakeCount = 0;
    let lastUpdate = 0;
    let subscription = null;

    Accelerometer.setUpdateInterval(100); // 10Hz
    subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (magnitude > 2.2) {
        if (now - lastUpdate > 150) {
          shakeCount++;
          lastUpdate = now;
          if (shakeCount >= 12) {
            isCheatingRef.current = true;
            setCheatAlertVisible(true);
            setTimeout(() => {
              isCheatingRef.current = false;
              shakeCount = 0;
            }, 5000);
          }
        }
      }

      if (now - lastUpdate > 2500) {
        shakeCount = Math.max(0, shakeCount - 1);
      }
    });

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // 듀오 걸음수 시뮬레이션
  useEffect(() => {
    if (duoName) {
      const base = Math.floor(steps * 0.95) + 4200;
      setDuoSteps(base);
    }
  }, [steps, duoName]);

  const handleAddManualSteps = async (amount) => {
    if (isCheatingRef.current && amount > 0) {
      Alert.alert('꼼수 방지', '치팅이 감지되어 걸음수 수동 추가가 차단되었습니다!');
      return;
    }
    const nextSteps = Math.max(0, steps + amount);
    const prevMile  = Math.floor(accumulatedSteps / 1000);
    const nextAcc   = Math.max(0, accumulatedSteps + amount);
    const nextMile  = Math.floor(nextAcc / 1000);
    let bonus = 0;
    if (amount > 0 && nextMile > prevMile) {
      bonus = (nextMile - prevMile) * 50;
      Alert.alert('🎉 마일스톤!', `${nextMile * 1000}보 돌파! +${bonus}P`);
    }
    const nextPoints = Math.max(0, points + bonus);
    accRef.current = nextAcc;
    lastTotalRef.current = nextSteps;
    setSteps(nextSteps); setAccumulatedSteps(nextAcc); setPoints(nextPoints); pointsRef.current = nextPoints;
    await updateUserStats({ todaySteps: nextSteps, accumulatedSteps: nextAcc, points: nextPoints }, userId);
  };

  const handleWarningSMS = async () => {
    if (steps >= targetSteps) { Alert.alert('🏆 이미 달성!', '오늘 목표를 달성했어요!'); return; }
    if (contacts.length === 0) { Alert.alert('연락처 없음', '설정 탭에서 경고 연락처를 등록해주세요.'); return; }
    
    // 실드가 활성화되어 있다면 벌칙 발송을 하루 면제!
    if (shieldActive) {
      Alert.alert('🛡️ 실드 방어 발동!', '벌칙 방지 실드가 작동하여 오늘 하루 경고 문자 발송을 면제받았습니다! 실드가 1회 소모됩니다.', [
        {
          text: '확인',
          onPress: async () => {
            setShieldActive(false);
            await updateUserStats({ shieldActive: false }, userId);
          }
        }
      ]);
      return;
    }

    Alert.alert('🚨 경고 문자 발송', `오늘 ${steps.toLocaleString()}보 / 목표 ${targetSteps.toLocaleString()}보\n연락처 1명에게 경고 문자를 보냅니다.`,
      [{ text: '취소', style: 'cancel' }, {
        text: '보내기', onPress: async () => {
          try {
            setIsGeneratingSMS(true);
            // AI 킹받는 문자 생성
            const aiMsg = await generateAIPenaltySMS(steps, nickname, null, duoName || null);
            setIsGeneratingSMS(false);

            const phones = contacts.map(c => typeof c === 'string' ? c : c.phone).filter(Boolean);
            const ok = await sendRandomWarningSMS(phones, aiMsg);
            if (ok) {
              const p = Math.max(0, pointsRef.current - 20);
              pointsRef.current = p; setPoints(p);
              await updateUserStats({ points: p }, userId);
            }
          } catch (e) {
            setIsGeneratingSMS(false);
            console.error("Failed to generate AI SMS:", e);
            Alert.alert('AI 작문 실패', '기본 사죄 문자로 발송합니다.');
            const phones = contacts.map(c => typeof c === 'string' ? c : c.phone).filter(Boolean);
            await sendRandomWarningSMS(phones);
          }
        }
      }]
    );
  };

  const charInfo   = getCharacterInfo(dailyGoalAchievements, nickname);
  const todayPct   = Math.min(100, Math.floor((steps / targetSteps) * 100));
  const progressPct = Math.min(100, charInfo.progress * 100);
  const achieved   = steps >= targetSteps;
  const ringColor  = achieved ? '#22C55E' : '#2563EB';
  const lvlColors  = LEVEL_COLORS[charInfo.level];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ─── 헤더 ─── */}
        <LinearGradient colors={['#2563EB', '#06B6D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <Text style={styles.logo}>🏃 Prototype</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {shieldActive && (
              <View style={styles.shieldBadge}>
                <Text style={styles.shieldBadgeText}>🛡️ 실드 활성</Text>
              </View>
            )}
            <View style={styles.pointBadge}>
              <Text style={styles.pointText}>⚡ {points} P</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ─── 👥 2인 연대책임 듀오 현황판 ─── */}
        {duoName ? (
          <View style={styles.duoCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.duoTitle}>👥 2인 연대책임 챌린지</Text>
              <View style={styles.duoBadge}>
                <Text style={styles.duoBadgeText}>연대책임</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'center' }}>
              <View style={{ flex: 1, backgroundColor: '#FAFAFC', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EFF6FF' }}>
                <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '800', width: '100%', textAlign: 'center' }} numberOfLines={1} ellipsizeMode="tail">나 ({nickname})</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1C1C28', marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{steps.toLocaleString()}보</Text>
              </View>
              <Text style={{ fontSize: 16, color: '#DCDCE6', fontWeight: '900' }}>vs</Text>
              <View style={{ flex: 1, backgroundColor: '#FAFAFC', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EFF6FF' }}>
                <Text style={{ fontSize: 11, color: '#06B6D4', fontWeight: '800', width: '100%', textAlign: 'center' }} numberOfLines={1} ellipsizeMode="tail">파트너 ({duoName})</Text>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1C1C28', marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{duoSteps.toLocaleString()}보</Text>
              </View>
            </View>
          </View>
        ) : null}

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
            colors={achieved ? ['#22C55E', '#16A34A'] : ['#2563EB', '#06B6D4']}
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
        <Text style={styles.charName} numberOfLines={1} ellipsizeMode="tail">{charInfo.name}</Text>
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

        {/* ─── 🛠️ 시연용 컨트롤 패널 ─── */}
        <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 12, backgroundColor: '#FEF3C7', borderRadius: 24, padding: 18, borderWidth: 1.5, borderColor: '#F59E0B' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#D97706', marginBottom: 10, textAlign: 'center' }}>
            🛠️ 시연용 컨트롤 (Demo Controls)
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => handleAddManualSteps(1000)} activeOpacity={0.80} style={{ flex: 1 }}>
              <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>+1,000보</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleAddManualSteps(-1000)} activeOpacity={0.80} style={{ flex: 1 }}>
              <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>-1,000보</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleDemoAddAchievement} activeOpacity={0.80}>
            <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>🏆 만보 달성일수 +1일 (레벨업 테스트)</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>

    {/* 💬 AI 사죄 문자 생성 로더 */}
    {isGeneratingSMS && (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,28,40,0.65)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1.5, borderColor: '#FFE4EC', width: '80%' }}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>💬</Text>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#1C1C28', marginBottom: 4 }}>AI 반성문 작성 중...</Text>
          <Text style={{ fontSize: 12, color: '#8A8A9A', textAlign: 'center', fontWeight: '500' }}>친구들의 화를 풀어줄 킹받는 사죄 멘트를 짜내는 중입니다.</Text>
        </View>
      </View>
    )}

    {/* 꼼수 감지 모달 */}
    {cheatAlertVisible && (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,28,40,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 24 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28, alignItems: 'center', width: '100%', borderWidth: 1.5, borderColor: '#FFE4EC' }}>
          <Text style={{ fontSize: 64, marginBottom: 12 }}>🐷</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1C1C28', marginBottom: 8 }}>🚨 꼼수 감지 경보!</Text>
          <Text style={{ fontSize: 13, color: '#8A8A9A', textAlign: 'center', lineHeight: 21, marginBottom: 24, fontWeight: '500' }}>
            비정상적인 흔들기가 감지되었습니다!{"\n"}
            신체 활동만 올바르게 인정됩니다.{"\n"}
            <Text style={{ color: '#2563EB', fontWeight: '800' }}>걸음수 카운트가 5초간 동결됩니다.</Text>
          </Text>
          <TouchableOpacity onPress={() => setCheatAlertVisible(false)} style={{ backgroundColor: '#2563EB', width: '100%', height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>반성하고 다시 걷기</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </View>
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
    shadowColor: '#2563EB',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#EFF6FF',
  },
  ringOuter: {
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 12, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 4 },
    elevation: 8, marginBottom: 18,
  },
  ringNum:      { fontSize: 44, fontWeight: '900', color: '#1C1C28', letterSpacing: -1 },
  ringNumGreen: { color: '#16A34A' },
  ringGoal:     { fontSize: 12, color: '#A0A0B0', marginTop: 2, fontWeight: '500' },
  ringPct:      { fontSize: 15, fontWeight: '800', marginTop: 6 },
  ringPctPink:  { color: '#2563EB' },
  ringPctGreen: { color: '#16A34A' },
  barBg: { width: '82%', height: 8, backgroundColor: '#EEF2F6', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
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
    shadowColor: '#2563EB',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#EFF6FF',
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
  maxTag: { marginBottom: 22, backgroundColor: '#EEF2F6', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 12 },
  maxTagText: { fontSize: 13, fontWeight: '800', color: '#2563EB' },

  /* 액션 */
  actions: { marginHorizontal: 16, marginBottom: 8 },
  btn: {
    borderRadius: 18, height: 54, alignItems: 'center', justifyContent: 'center', width: '100%',
    shadowColor: '#2563EB', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  btnDone: { backgroundColor: '#D1FAE5', marginBottom: 0 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  simLabel: { fontSize: 13, fontWeight: '800', color: '#A4A4B4', textAlign: 'center', marginBottom: 12, letterSpacing: 0.5 },
  simRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  simBtn: { borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },

  duoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#2563EB', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5, borderColor: '#EFF6FF',
  },
  duoTitle: { fontSize: 14, fontWeight: '900', color: '#1C1C28' },
  duoBadge: { backgroundColor: '#EFF6FF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  duoBadgeText: { fontSize: 10, color: '#2563EB', fontWeight: '800' },
  shieldBadge: { backgroundColor: '#D1FAE5', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  shieldBadgeText: { fontSize: 12, color: '#065F46', fontWeight: '800' },
});
