import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { checkPedometerAvailability, startStepCountSubscription } from '../services/pedometer';
import { getUserStats, updateUserStats, getAppSettings } from '../services/firebase';
import { sendRandomWarningSMS } from '../services/smsAlert';

export default function HomeScreen() {
  const [steps, setSteps] = useState(0);
  const [accumulatedSteps, setAccumulatedSteps] = useState(0);
  const [targetSteps, setTargetSteps] = useState(5000);
  const [points, setPoints] = useState(100);
  const [contacts, setContacts] = useState([]);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);

  useEffect(() => {
    // 1. 초기 데이터 가져오기 (Firebase or Mock)
    const initData = async () => {
      const stats = await getUserStats();
      setSteps(stats.todaySteps);
      setAccumulatedSteps(stats.accumulatedSteps);
      setPoints(stats.points);

      const settings = await getAppSettings();
      setTargetSteps(settings.targetSteps);
      setContacts(settings.warningContacts || []);
    };

    initData();

    // 2. 만보기 센서 초기화
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
              // 데이터 실시간 동기화
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

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // 시연 및 테스트용: 수동으로 걸음수 올리기 유틸리티
  const handleAddManualSteps = async (amount) => {
    const nextSteps = steps + amount;
    const nextAcc = accumulatedSteps + amount;
    
    // 100보당 10포인트 적립 보너스
    let pointBonus = 0;
    if (Math.floor(nextAcc / 100) > Math.floor(accumulatedSteps / 100)) {
      pointBonus = 10;
      Alert.alert("🎉 100보 달성!", "보너스로 10포인트를 획득했습니다!");
    }

    const nextPoints = points + pointBonus;

    setSteps(nextSteps);
    setAccumulatedSteps(nextAcc);
    setPoints(nextPoints);

    await updateUserStats({
      todaySteps: nextSteps,
      accumulatedSteps: nextAcc,
      points: nextPoints
    });
  };

  // 오늘 하루 마감 & 걸음수 목표 체크 시뮬레이션
  const handleCheckTargetAndAlert = async () => {
    if (steps >= targetSteps) {
      Alert.alert("🏆 목표 달성!", "축하합니다! 오늘의 목표 걸음수를 달성하여 안전합니다. 🐷");
    } else {
      Alert.alert(
        "🚨 목표 달성 실패!",
        `오늘 ${targetSteps}보 목표에 미달하였습니다 (${steps}보 달성).\n지정된 연락처 중 한 명에게 경고 SMS 발송 화면을 띄웁니다.`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "문자 띄우기",
            onPress: async () => {
              if (contacts.length === 0) {
                Alert.alert("연락처 부재", "설정 탭에서 경고를 발송할 연락처를 등록해 주세요!");
                return;
              }
              const success = await sendRandomWarningSMS(contacts);
              if (success) {
                // 발송 성공 시 반성 포인트 차감 및 동기화 (기획 요소)
                const nextPoints = Math.max(0, points - 10);
                setPoints(nextPoints);
                await updateUserStats({ points: nextPoints });
              }
            }
          }
        ]
      );
    }
  };

  // 누적 걸음수 기반 캐릭터 진화 렌더링 헬퍼
  const renderCharacterCard = () => {
    let emoji = "🐷";
    let levelName = "아기돼지 핑키";
    let desc = "매일 누워있는 귀여운 게으름뱅이 돼지";
    let nextThreshold = "100보";
    let progressRatio = accumulatedSteps / 100;

    if (accumulatedSteps >= 100 && accumulatedSteps < 200) {
      emoji = "🐖";
      levelName = "질주하는 핑키";
      desc = "일어나 걷기 시작한 성장형 아기 돼지";
      nextThreshold = "200보";
      progressRatio = (accumulatedSteps - 100) / 100;
    } else if (accumulatedSteps >= 200 && accumulatedSteps < 300) {
      emoji = "🐗";
      levelName = "근육 멧돼지 빌더";
      desc = "튼튼한 다리 근육을 장착하기 시작한 멧돼지";
      nextThreshold = "300보";
      progressRatio = (accumulatedSteps - 200) / 100;
    } else if (accumulatedSteps >= 300) {
      emoji = "👑🐗";
      levelName = "세상을 구한 돼지 영웅";
      desc = "더 이상 게으르지 않은 최강의 근육 돼지";
      nextThreshold = "최고 등급 달성!";
      progressRatio = 1;
    }

    return (
      <View style={styles.characterCard}>
        <Text style={styles.characterEmoji}>{emoji}</Text>
        <Text style={styles.characterLevel}>{levelName}</Text>
        <Text style={styles.characterDesc}>{desc}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBarWrapper}>
            <View style={[styles.progressBar, { width: `${Math.min(100, progressRatio * 100)}%` }]} />
          </View>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>누적 걸음: {accumulatedSteps}보</Text>
            <Text style={styles.progressLabel}>다음 단계: {nextThreshold}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      {/* 상단 포인트 및 상태바 */}
      <View style={styles.header}>
        <Text style={styles.logo}>🐷 핑키 피트니스</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>⚡ {points} P</Text>
        </View>
      </View>

      {/* 오늘 걸음수 서클 */}
      <View style={styles.stepCircleContainer}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepText}>{steps}</Text>
          <Text style={styles.stepSubtext}>/ {targetSteps} 걸음</Text>
        </View>
        <Text style={styles.sensorStatus}>
          {isPedometerAvailable ? "🟢 만보기 센서 작동 중" : "🟡 만보기 미지원 (시뮬레이터 모드)"}
        </Text>
      </View>

      {/* 캐릭터 진화 정보 카드 */}
      {renderCharacterCard()}

      {/* 액션 컨트롤 패널 */}
      <View style={styles.actionPanel}>
        <Text style={styles.panelTitle}>⚡ 실시간 시연 컨트롤 (해커톤용)</Text>
        
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.stepBtn]} onPress={() => handleAddManualSteps(50)}>
            <Text style={styles.actionBtnText}>+50보 걷기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.stepBtn]} onPress={() => handleAddManualSteps(500)}>
            <Text style={styles.actionBtnText}>+500보 걷기</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.actionBtn, styles.alertBtn]} onPress={handleCheckTargetAndAlert}>
          <Text style={styles.actionBtnText}>🚨 미달성 체크 & 문자 시뮬레이션</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343A40',
  },
  pointBadge: {
    backgroundColor: '#FFE3E3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  pointText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepCircleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  stepCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 8,
    borderColor: '#FF8787',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  stepText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#212529',
  },
  stepSubtext: {
    fontSize: 14,
    color: '#868E96',
    marginTop: 4,
  },
  sensorStatus: {
    fontSize: 12,
    color: '#868E96',
    marginTop: 10,
  },
  characterCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  characterEmoji: {
    fontSize: 64,
    marginBottom: 10,
  },
  characterLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
  },
  characterDesc: {
    fontSize: 13,
    color: '#868E96',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 15,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarWrapper: {
    width: '100%',
    height: 10,
    backgroundColor: '#F1F3F5',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF8787',
    borderRadius: 5,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: '#868E96',
  },
  actionPanel: {
    width: '100%',
    backgroundColor: '#E9ECEF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  actionBtn: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
  },
  stepBtn: {
    flex: 0.48,
    backgroundColor: '#4DABF7',
  },
  alertBtn: {
    width: '100%',
    backgroundColor: '#FA5252',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
