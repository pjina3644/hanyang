import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, Alert, Image
} from 'react-native';
import { checkPedometerAvailability, startStepCountSubscription } from '../services/pedometer';
import { getUserStats, updateUserStats, getAppSettings } from '../services/firebase';
import { sendRandomWarningSMS } from '../services/smsAlert';

// 캐릭터 레벨별 일러스트 (static require 필수)
const CHAR_IMAGES = [
  require('../assets/char_level0.png'),
  require('../assets/char_level1.png'),
  require('../assets/char_level2.png'),
  require('../assets/char_level3.png'),
];

// 만보(10,000보) 달성일 기준 레벨
function getCharacterInfo(dailyGoalAchievements, nickname) {
  const n = nickname || '핑키';
  if (dailyGoalAchievements >= 100) {
    return {
      level: 3,
      name: `존예${n}`,
      desc: '완벽한 몸과 빛나는 아우라 — 이제 신의 경지',
      nextThreshold: null,
      progress: 1,
    };
  }
  if (dailyGoalAchievements >= 30) {
    return {
      level: 2,
      name: `운동왕${n}`,
      desc: '근육이 터질 것 같은 운동 마니아',
      nextThreshold: 100,
      progress: (dailyGoalAchievements - 30) / 70,
    };
  }
  if (dailyGoalAchievements >= 10) {
    return {
      level: 1,
      name: `인간${n}`,
      desc: '드디어 두 발로 걷기 시작한 진화형',
      nextThreshold: 30,
      progress: (dailyGoalAchievements - 10) / 20,
    };
  }
  return {
    level: 0,
    name: `돼지${n}`,
    desc: '침대와 과자가 전부였던 게으름의 상징',
    nextThreshold: 10,
    progress: dailyGoalAchievements / 10,
  };
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

  useEffect(() => {
    const initData = async () => {
      const stats = await getUserStats();
      setSteps(stats.todaySteps || 0);
      setAccumulatedSteps(stats.accumulatedSteps || 0);
      setPoints(stats.points || 100);
      setDailyGoalAchievements(stats.dailyGoalAchievements || 0);
      setTodayGoalAchieved(stats.todayGoalAchieved || false);

      const settings = await getAppSettings();
      setTargetSteps(settings.targetSteps || 10000);
      setNickname(settings.nickname || '핑키');
      setContacts(settings.warningContacts || []);
    };
    initData();

    let subscription = null;
    const setupPedometer = async () => {
      const available = await checkPedometerAvailability();
      setIsPedometerAvailable(available);
      if (available) {
        subscription = startStepCountSubscription((newSteps) => {
          setSteps((prev) => {
            const added = newSteps - prev;
            if (added > 0) {
              const updatedToday = prev + added;
              const updatedAcc = accumulatedSteps + added;
              updateUserStats({ todaySteps: updatedToday, accumulatedSteps: updatedAcc });
              setAccumulatedSteps(updatedAcc);
              return updatedToday;
            }
            return prev;
          });
        });
      }
    };
    setupPedometer();
    return () => { if (subscription) subscription.remove(); };
  }, []);

  // 수동 걸음수 추가 (시연용)
  const handleAddManualSteps = async (amount) => {
    const nextSteps = steps + amount;
    const nextAcc = accumulatedSteps + amount;

    let pointBonus = 0;
    const prevMilestone = Math.floor(accumulatedSteps / 1000);
    const nextMilestone = Math.floor(nextAcc / 1000);
    if (nextMilestone > prevMilestone) {
      pointBonus = (nextMilestone - prevMilestone) * 50;
      Alert.alert('🎉 걸음 마일스톤!', `${nextMilestone * 1000}보 돌파! +${pointBonus}P 획득!`);
    }

    const nextPoints = points + pointBonus;
    setSteps(nextSteps);
    setAccumulatedSteps(nextAcc);
    setPoints(nextPoints);
    await updateUserStats({ todaySteps: nextSteps, accumulatedSteps: nextAcc, points: nextPoints });
  };

  // 오늘 만보 달성 시뮬레이션 (하루 1회 레벨 카운트 상승)
  const handleDailyGoalAchieved = async () => {
    if (todayGoalAchieved) {
      Alert.alert('이미 달성!', '오늘 만보 달성은 이미 기록되었습니다. 내일 또 도전하세요!');
      return;
    }
    const nextDays = dailyGoalAchievements + 1;
    const nextPoints = points + 100;
    setDailyGoalAchievements(nextDays);
    setTodayGoalAchieved(true);
    setPoints(nextPoints);

    const charInfo = getCharacterInfo(nextDays, nickname);
    const prevChar = getCharacterInfo(dailyGoalAchievements, nickname);
    await updateUserStats({
      dailyGoalAchievements: nextDays,
      todayGoalAchieved: true,
      points: nextPoints,
    });

    if (charInfo.level > prevChar.level) {
      Alert.alert('🚀 레벨업!', `축하합니다!\n'${prevChar.name}' → '${charInfo.name}'\n으로 진화했습니다!`);
    } else {
      Alert.alert('✅ 만보 달성!', `오늘의 만보 달성 완료!\n누적 달성일: ${nextDays}일 (+100P)`);
    }
  };

  // 목표 미달성 체크
  const handleCheckTargetAndAlert = async () => {
    if (steps >= targetSteps) {
      Alert.alert('🏆 목표 달성!', `오늘 ${targetSteps.toLocaleString()}보 달성! 만보 달성 버튼을 눌러 기록하세요.`);
    } else {
      Alert.alert(
        '🚨 목표 미달성!',
        `오늘 ${targetSteps.toLocaleString()}보 목표에 ${steps.toLocaleString()}보 달성.\n지정 연락처에 경고 문자를 보냅니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '문자 띄우기',
            onPress: async () => {
              if (contacts.length === 0) {
                Alert.alert('연락처 없음', '설정 탭에서 경고 연락처를 등록해주세요.');
                return;
              }
              const success = await sendRandomWarningSMS(contacts);
              if (success) {
                const nextPoints = Math.max(0, points - 20);
                setPoints(nextPoints);
                await updateUserStats({ points: nextPoints });
              }
            }
          }
        ]
      );
    }
  };

  const charInfo = getCharacterInfo(dailyGoalAchievements, nickname);
  const progressPct = Math.min(100, charInfo.progress * 100);

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
        <View style={[
          styles.stepCircle,
          steps >= targetSteps && styles.stepCircleAchieved
        ]}>
          <Text style={styles.stepNum}>{steps.toLocaleString()}</Text>
          <Text style={styles.stepGoal}>/ {targetSteps.toLocaleString()} 걸음</Text>
          {steps >= targetSteps && <Text style={styles.stepAchievedBadge}>🎉 달성!</Text>}
        </View>
        <Text style={styles.sensorStatus}>
          {isPedometerAvailable ? '🟢 만보기 작동 중' : '🟡 시뮬레이터 모드'}
        </Text>
      </View>

      {/* 캐릭터 카드 */}
      <View style={styles.charCard}>
        <Image
          source={CHAR_IMAGES[charInfo.level]}
          style={styles.charImage}
          resizeMode="contain"
        />
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
        <Text style={styles.panelTitle}>⚡ 시연 컨트롤</Text>

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
            {todayGoalAchieved ? '✅ 오늘 만보 달성 완료' : '🏅 오늘 만보 달성! (+100P, 레벨 카운트)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.redBtn]} onPress={handleCheckTargetAndAlert}>
          <Text style={styles.btnText}>🚨 미달성 경고 문자 시뮬레이션</Text>
        </TouchableOpacity>
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

  stepCircleWrap: { alignItems: 'center', marginBottom: 24 },
  stepCircle: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#FFFFFF', borderWidth: 8, borderColor: '#FF8787',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  stepCircleAchieved: { borderColor: '#51CF66' },
  stepNum: { fontSize: 36, fontWeight: 'bold', color: '#212529' },
  stepGoal: { fontSize: 13, color: '#868E96', marginTop: 4 },
  stepAchievedBadge: { fontSize: 13, color: '#37B24D', fontWeight: 'bold', marginTop: 4 },
  sensorStatus: { fontSize: 12, color: '#868E96', marginTop: 10 },

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
