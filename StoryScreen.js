import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { getUserStats, getStoryHistory, saveStoryHistory, updateUserStats } from '../services/firebase';
import { generateNextStorySegment } from '../services/aiStory';

export default function StoryScreen() {
  const [history, setHistory] = useState([]);
  const [accumulatedSteps, setAccumulatedSteps] = useState(0);
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 현재 다음 스토리를 해금할 수 있는지 확인하기 위한 계산 변수
  // 예: 이미 생성된 스토리 개수 * 100보 이상이어야 다음 스토리 해금 가능
  const nextUnlockThreshold = history.length * 100;
  const canUnlockNext = accumulatedSteps >= nextUnlockThreshold && nextUnlockThreshold > 0;

  useEffect(() => {
    const loadStoryData = async () => {
      const stats = await getUserStats();
      setAccumulatedSteps(stats.accumulatedSteps);
      setPoints(stats.points);

      const storyHist = await getStoryHistory();
      setHistory(storyHist);
    };

    loadStoryData();
  }, []);

  // 새로운 이야기 조각 잠금 해제 (API 호출)
  const handleUnlockNextStory = async (selectedOptionText = "", cost = 0) => {
    if (points < cost) {
      Alert.alert("포인트 부족", `이 선택지는 ${cost} 포인트가 필요합니다. 현재 ${points} 포인트가 있습니다.`);
      return;
    }

    setIsLoading(true);
    try {
      // 1. 포인트 소모
      const nextPoints = points - cost;
      setPoints(nextPoints);

      // 2. 만약 선택지를 골라서 호출하는 것이라면 이전 기록에 선택한 항목 마킹
      let updatedHistory = [...history];
      if (selectedOptionText && updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1].selectedOption = selectedOptionText;
      }

      // 3. Gemini 또는 Mock AI로 다음 스토리 세그먼트 생성
      const nextSegment = await generateNextStorySegment(updatedHistory, selectedOptionText);
      
      // 4. 역사 데이터 업데이트
      const newStoryItem = {
        id: (updatedHistory.length + 1).toString(),
        content: nextSegment.content,
        options: nextSegment.options,
        nextStep: nextSegment.nextStep,
        selectedOption: null
      };
      
      updatedHistory.push(newStoryItem);
      setHistory(updatedHistory);

      // 5. Firebase 동기화
      await saveStoryHistory(updatedHistory);
      await updateUserStats({ points: nextPoints });

    } catch (error) {
      console.error(error);
      Alert.alert("스토리 생성 오류", "스토리를 불러오는 중 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>📖 핑키의 모험 일지</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>⚡ {points} P</Text>
          <Text style={styles.statusText}>🚶‍♂️ {accumulatedSteps}보</Text>
        </View>
      </View>

      {/* 모험 타임라인 스크롤 뷰 */}
      <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent}>
        {history.map((story, index) => (
          <View key={story.id} style={styles.storyCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Chapter {index + 1}</Text>
            </View>
            
            <Text style={styles.storyText}>{story.content}</Text>

            {/* 이미 선택한 선택지가 있다면 표시 */}
            {story.selectedOption && (
              <View style={styles.choiceMadeBox}>
                <Text style={styles.choiceMadeLabel}>나의 선택 ➡️</Text>
                <Text style={styles.choiceMadeText}>{story.selectedOption}</Text>
              </View>
            )}

            {/* 마지막 카드에만 활성 선택지 렌더링 */}
            {index === history.length - 1 && story.options && !story.selectedOption && (
              <View style={styles.optionsContainer}>
                <Text style={styles.optionHelpText}>행동을 선택하고 모험을 이어가세요 (포인트 소모):</Text>
                {story.options.map((opt, optIdx) => (
                  <TouchableOpacity
                    key={optIdx}
                    style={styles.optionBtn}
                    onPress={() => handleUnlockNextStory(opt.text, opt.costPoints)}
                  >
                    <Text style={styles.optionBtnText}>{opt.text}</Text>
                    <Text style={styles.optionCost}>⚡ {opt.costPoints}P</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FF8787" />
            <Text style={styles.loadingText}>AI가 다음 모험을 구상하고 있습니다...</Text>
          </View>
        )}

        {/* 새 챕터 해금 가능 상태 표시 */}
        {!isLoading && history.length > 0 && history[history.length - 1].selectedOption && (
          <View style={styles.unlockPanel}>
            {accumulatedSteps >= nextUnlockThreshold ? (
              <View style={styles.unlockActiveBox}>
                <Text style={styles.unlockMessage}>🎉 100보 이상 더 걸어서 새로운 챕터가 해금되었습니다!</Text>
                <TouchableOpacity
                  style={styles.unlockBtn}
                  onPress={() => handleUnlockNextStory("", 0)}
                >
                  <Text style={styles.unlockBtnText}>📖 다음 챕터 쓰기 (0P)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.unlockLockedBox}>
                <Text style={styles.unlockLockIcon}>🔒 다음 챕터 잠김</Text>
                <Text style={styles.unlockProgressText}>
                  누적 걸음수 {nextUnlockThreshold}보에 도달해야 다음 이야기가 해금됩니다.
                </Text>
                <Text style={styles.unlockNeedText}>
                  (앞으로 {nextUnlockThreshold - accumulatedSteps}보 더 걸어야 함)
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343A40',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#495057',
    backgroundColor: '#F1F3F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    padding: 20,
    paddingBottom: 40,
  },
  storyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE3E3',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  stepBadgeText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  storyText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#495057',
  },
  choiceMadeBox: {
    marginTop: 15,
    backgroundColor: '#F1F3F5',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceMadeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#868E96',
    marginRight: 6,
  },
  choiceMadeText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '600',
    flex: 1,
  },
  optionsContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 15,
  },
  optionHelpText: {
    fontSize: 12,
    color: '#868E96',
    marginBottom: 10,
  },
  optionBtn: {
    backgroundColor: '#FFF4F4',
    borderWidth: 1,
    borderColor: '#FFE3E3',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionBtnText: {
    fontSize: 13,
    color: '#E03131',
    fontWeight: '600',
    flex: 0.85,
  },
  optionCost: {
    fontSize: 12,
    color: '#E03131',
    fontWeight: 'bold',
  },
  loadingBox: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: '#868E96',
    marginTop: 10,
  },
  unlockPanel: {
    marginTop: 10,
    alignItems: 'center',
  },
  unlockActiveBox: {
    width: '100%',
    backgroundColor: '#E8F7F0',
    borderWidth: 1,
    borderColor: '#C2EAD6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  unlockMessage: {
    fontSize: 13,
    color: '#2B8A3E',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  unlockBtn: {
    backgroundColor: '#37B24D',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  unlockLockedBox: {
    width: '100%',
    backgroundColor: '#F1F3F5',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  unlockLockIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#868E96',
    marginBottom: 6,
  },
  unlockProgressText: {
    fontSize: 12,
    color: '#495057',
    textAlign: 'center',
  },
  unlockNeedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 4,
  },
});
