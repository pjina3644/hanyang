import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { getUserStats, getStoryHistory, saveStoryHistory, updateUserStats, getAppSettings } from '../services/firebase';
import { generateNextStorySegment, getRandomTheme, STORY_THEMES } from '../services/aiStory';

// 누적 걸음수 1,000보당 1챕터 해금
const STEPS_PER_CHAPTER = 1000;

export default function StoryScreen() {
  const [history, setHistory] = useState([]);
  const [accumulatedSteps, setAccumulatedSteps] = useState(0);
  const [points, setPoints] = useState(0);
  const [nickname, setNickname] = useState('핑키');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState(null);

  // 해금 가능한 챕터 수 = Math.floor(누적걸음 / 1000)
  // 이미 쓴 챕터 수 = history.length
  const unlockedChapters = Math.floor(accumulatedSteps / STEPS_PER_CHAPTER);
  const canWriteNextChapter = unlockedChapters > history.length;
  const stepsToNextChapter = history.length > 0
    ? Math.max(0, (history.length + 1) * STEPS_PER_CHAPTER - accumulatedSteps)
    : Math.max(0, STEPS_PER_CHAPTER - accumulatedSteps);

  useEffect(() => {
    const loadData = async () => {
      const stats = await getUserStats();
      setAccumulatedSteps(stats.accumulatedSteps || 0);
      setPoints(stats.points || 0);

      const settings = await getAppSettings();
      setNickname(settings.nickname || '핑키');

      const hist = await getStoryHistory();
      setHistory(hist);

      // 저장된 테마가 있으면 복원, 없으면 랜덤 배정
      if (hist.length > 0 && hist[0].themeId) {
        const found = STORY_THEMES.find(t => t.id === hist[0].themeId);
        setActiveTheme(found || getRandomTheme());
      } else if (hist.length === 0) {
        setActiveTheme(getRandomTheme());
      }
    };
    loadData();
  }, []);

  const handleUnlockNextStory = async (selectedOptionText = '', cost = 0) => {
    if (!canWriteNextChapter && history.length > 0) {
      Alert.alert('걸음 부족', `다음 챕터를 열려면 ${stepsToNextChapter.toLocaleString()}보를 더 걸어야 합니다.`);
      return;
    }
    if (points < cost) {
      Alert.alert('포인트 부족', `이 선택지는 ${cost}P가 필요합니다. 현재 ${points}P`);
      return;
    }

    setIsLoading(true);
    try {
      const nextPoints = points - cost;
      setPoints(nextPoints);

      let updatedHistory = [...history];
      if (selectedOptionText && updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1].selectedOption = selectedOptionText;
      }

      const theme = activeTheme || getRandomTheme();
      const segment = await generateNextStorySegment(
        updatedHistory,
        selectedOptionText,
        theme,
        accumulatedSteps,
        nickname,
      );

      const newItem = {
        id: (updatedHistory.length + 1).toString(),
        content: segment.content,
        options: segment.options,
        themeId: segment.themeId || theme.id,
        selectedOption: null,
      };

      updatedHistory.push(newItem);
      setHistory(updatedHistory);
      await saveStoryHistory(updatedHistory);
      await updateUserStats({ points: nextPoints });

    } catch (err) {
      console.error(err);
      Alert.alert('오류', '스토리를 불러오는 중 에러가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetStory = () => {
    Alert.alert(
      '스토리 초기화',
      '스토리를 처음부터 다시 시작하고 랜덤 테마를 바꿉니다. 진행한 내용은 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화', style: 'destructive',
          onPress: async () => {
            const newTheme = getRandomTheme();
            setActiveTheme(newTheme);
            setHistory([]);
            await saveStoryHistory([]);
          }
        }
      ]
    );
  };

  const themeInfo = activeTheme || STORY_THEMES[0];

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📖 {nickname}의 모험</Text>
          {activeTheme && (
            <View style={styles.themeBadge}>
              <Text style={styles.themeText}>{themeInfo.name}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.statusText}>⚡ {points}P</Text>
          <Text style={styles.statusText}>🚶 {accumulatedSteps.toLocaleString()}보</Text>
          <TouchableOpacity onPress={handleResetStory} style={styles.resetBtn}>
            <Text style={styles.resetText}>🔀 테마변경</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 걸음수 기반 해금 진행률 */}
      <View style={styles.unlockBar}>
        <Text style={styles.unlockBarText}>
          📡 해금된 챕터: <Text style={{ fontWeight: 'bold', color: '#FF6B6B' }}>{unlockedChapters}개</Text>
          {'  '}|{'  '}
          다음 챕터까지: <Text style={{ fontWeight: 'bold' }}>{stepsToNextChapter.toLocaleString()}보</Text>
        </Text>
      </View>

      <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent}>

        {/* 스토리 없을 때 시작 안내 */}
        {history.length === 0 && !isLoading && (
          <View style={styles.startCard}>
            <Text style={styles.startEmoji}>🎲</Text>
            <Text style={styles.startThemeName}>{themeInfo.name}</Text>
            <Text style={styles.startThemeDesc}>{themeInfo.desc}</Text>
            <Text style={styles.startDesc}>
              {accumulatedSteps >= STEPS_PER_CHAPTER
                ? `${STEPS_PER_CHAPTER.toLocaleString()}보 달성! 첫 챕터를 시작할 수 있습니다.`
                : `첫 챕터를 열려면 ${stepsToNextChapter.toLocaleString()}보를 더 걸어야 합니다.`}
            </Text>
            {accumulatedSteps >= STEPS_PER_CHAPTER && (
              <TouchableOpacity style={styles.startBtn} onPress={() => handleUnlockNextStory('', 0)}>
                <Text style={styles.startBtnText}>🚀 이야기 시작!</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 스토리 챕터 목록 */}
        {history.map((story, index) => (
          <View key={story.id} style={styles.storyCard}>
            <View style={styles.chapterBadge}>
              <Text style={styles.chapterText}>Chapter {index + 1}</Text>
            </View>

            <Text style={styles.storyText}>{story.content}</Text>

            {story.selectedOption && (
              <View style={styles.choiceBox}>
                <Text style={styles.choiceLabel}>내 선택 ➡️</Text>
                <Text style={styles.choiceText}>{story.selectedOption}</Text>
              </View>
            )}

            {/* 마지막 챕터의 선택지 */}
            {index === history.length - 1 && story.options && !story.selectedOption && (
              <View style={styles.optionsWrap}>
                <Text style={styles.optionHint}>행동을 선택하세요 (포인트 소모):</Text>
                {story.options.map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.optionBtn}
                    onPress={() => handleUnlockNextStory(opt.text, opt.costPoints)}
                  >
                    <Text style={styles.optionText}>{opt.text}</Text>
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
            <Text style={styles.loadingText}>AI가 다음 이야기를 쓰고 있습니다...</Text>
          </View>
        )}

        {/* 선택 완료 후 다음 챕터 해금 여부 */}
        {!isLoading && history.length > 0 && history[history.length - 1].selectedOption && (
          <View style={styles.nextChapterPanel}>
            {canWriteNextChapter ? (
              <View style={styles.unlockActiveBox}>
                <Text style={styles.unlockMsg}>🎉 다음 챕터가 해금되었습니다!</Text>
                <TouchableOpacity style={styles.unlockBtn} onPress={() => handleUnlockNextStory('', 0)}>
                  <Text style={styles.unlockBtnText}>📖 다음 챕터 읽기 (0P)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.lockedBox}>
                <Text style={styles.lockedIcon}>🔒 다음 챕터 잠김</Text>
                <Text style={styles.lockedDesc}>
                  {stepsToNextChapter.toLocaleString()}보를 더 걸면 해금됩니다
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E9ECEF',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#343A40', marginBottom: 4 },
  themeBadge: { backgroundColor: '#FFF5F5', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start' },
  themeText: { fontSize: 11, color: '#FF6B6B', fontWeight: 'bold' },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#495057', backgroundColor: '#F1F3F5', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  resetBtn: { marginTop: 4 },
  resetText: { fontSize: 11, color: '#4DABF7', fontWeight: 'bold' },

  unlockBar: { backgroundColor: '#FFF9DB', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#FFE066' },
  unlockBarText: { fontSize: 12, color: '#664D03' },

  timeline: { flex: 1 },
  timelineContent: { padding: 16, paddingBottom: 40 },

  startCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  startEmoji: { fontSize: 48, marginBottom: 12 },
  startThemeName: { fontSize: 20, fontWeight: 'bold', color: '#343A40', marginBottom: 6 },
  startThemeDesc: { fontSize: 13, color: '#868E96', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  startDesc: { fontSize: 12, color: '#495057', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  startBtn: { backgroundColor: '#FF8787', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  startBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },

  storyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  chapterBadge: { alignSelf: 'flex-start', backgroundColor: '#FFE3E3', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, marginBottom: 12 },
  chapterText: { fontSize: 11, color: '#FF6B6B', fontWeight: 'bold' },
  storyText: { fontSize: 15, lineHeight: 26, color: '#343A40' },

  choiceBox: { marginTop: 14, backgroundColor: '#F1F3F5', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  choiceLabel: { fontSize: 11, fontWeight: 'bold', color: '#868E96' },
  choiceText: { fontSize: 13, color: '#495057', fontWeight: '600', flex: 1 },

  optionsWrap: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#F1F3F5', paddingTop: 14 },
  optionHint: { fontSize: 12, color: '#868E96', marginBottom: 10 },
  optionBtn: {
    backgroundColor: '#FFF4F4', borderWidth: 1, borderColor: '#FFE3E3', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  optionText: { fontSize: 13, color: '#E03131', fontWeight: '600', flex: 0.85 },
  optionCost: { fontSize: 12, color: '#E03131', fontWeight: 'bold' },

  loadingBox: { alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 13, color: '#868E96', marginTop: 10 },

  nextChapterPanel: { marginTop: 8, alignItems: 'center' },
  unlockActiveBox: { width: '100%', backgroundColor: '#E8F7F0', borderWidth: 1, borderColor: '#C2EAD6', borderRadius: 14, padding: 18, alignItems: 'center' },
  unlockMsg: { fontSize: 13, color: '#2B8A3E', fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  unlockBtn: { backgroundColor: '#37B24D', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  unlockBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  lockedBox: { width: '100%', backgroundColor: '#F1F3F5', borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 14, padding: 20, alignItems: 'center' },
  lockedIcon: { fontSize: 15, fontWeight: 'bold', color: '#868E96', marginBottom: 6 },
  lockedDesc: { fontSize: 12, color: '#FF6B6B', fontWeight: 'bold' },
});
