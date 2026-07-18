import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserStats, getStoryHistory, saveStoryHistory, updateUserStats, getAppSettings } from '../services/firebase';
import { generateNextStorySegment, getRandomTheme, STORY_THEMES } from '../services/aiStory';

const STEPS_PER_CHAPTER = 1000;

export default function StoryScreen({ userId = "default_user" }) {
  const [history, setHistory]                   = useState([]);
  const [accumulatedSteps, setAccumulatedSteps] = useState(0);
  const [points, setPoints]                     = useState(0);
  const [nickname, setNickname]                 = useState('핑키');
  const [isLoading, setIsLoading]               = useState(false);
  const [activeTheme, setActiveTheme]           = useState(null);
  const [storyKeys, setStoryKeys]               = useState(0);

  const unlockedChapters    = Math.floor(accumulatedSteps / STEPS_PER_CHAPTER);
  const canWriteNextChapter = unlockedChapters > history.length;
  const stepsToNext         = history.length > 0
    ? Math.max(0, (history.length + 1) * STEPS_PER_CHAPTER - accumulatedSteps)
    : Math.max(0, STEPS_PER_CHAPTER - accumulatedSteps);

  useEffect(() => {
    const load = async () => {
      const stats    = await getUserStats(userId);
      const settings = await getAppSettings(userId);
      const hist     = await getStoryHistory(userId);
      setAccumulatedSteps(stats.accumulatedSteps || 0);
      setPoints(stats.points || 0);
      setNickname(settings.nickname || '');
      setHistory(hist);
      setStoryKeys(stats.storyKeys || 0);
      if (hist.length > 0 && hist[0].themeId) {
        setActiveTheme(STORY_THEMES.find(t => t.id === hist[0].themeId) || STORY_THEMES[0]);
      } else if (stats.storyTheme) {
        setActiveTheme(STORY_THEMES.find(t => t.id === stats.storyTheme) || STORY_THEMES[0]);
      } else {
        const randTheme = getRandomTheme();
        setActiveTheme(randTheme);
        await updateUserStats({ storyTheme: randTheme.id }, userId);
      }
    };
    load();
  }, [userId]);

  const handleUseStoryKey = async () => {
    if (storyKeys <= 0) {
      Alert.alert('열쇠 부족', '포인트 상점에서 [히든 스토리 열쇠]를 먼저 구매해 주세요!');
      return;
    }
    const nextKeys = storyKeys - 1;
    setStoryKeys(nextKeys);
    await updateUserStats({ storyKeys: nextKeys }, userId);
    
    // 히든 스토리 진행
    await handleUnlockNextStory('🔑 (히든) 상상도 못한 정체와 함께 숨겨진 조력자가 나타났다!', 0);
  };

  const handleUnlockNextStory = async (selectedOptionText = '', cost = 0) => {
    if (!canWriteNextChapter && history.length > 0) {
      Alert.alert('걸음 부족', `다음 챕터까지 ${stepsToNext.toLocaleString()}보 더 필요합니다.`);
      return;
    }
    if (points < cost) { Alert.alert('포인트 부족', `${cost}P 필요, 현재 ${points}P`); return; }

    setIsLoading(true);
    try {
      const nextPoints = points - cost;
      setPoints(nextPoints);
      let updated = [...history];
      if (selectedOptionText && updated.length > 0)
        updated[updated.length - 1].selectedOption = selectedOptionText;

      const theme   = activeTheme || getRandomTheme();
      const segment = await generateNextStorySegment(updated, selectedOptionText, theme, accumulatedSteps, nickname);
      const newItem = {
        id: (updated.length + 1).toString(),
        content: segment.content,
        options: segment.options,
        themeId: segment.themeId || theme.id,
        selectedOption: null,
      };
      updated.push(newItem);
      setHistory(updated);
      await saveStoryHistory(updated, userId);
      await updateUserStats({ points: nextPoints }, userId);
    } catch (err) {
      Alert.alert('오류', '스토리를 불러오는 중 에러가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetStory = () => {
    Alert.alert('스토리 초기화', '처음부터 다시 시작하고 테마를 바꿉니다. 진행 내용이 삭제됩니다.',
      [{ text: '취소', style: 'cancel' },
        { text: '초기화', style: 'destructive', onPress: async () => {
          const t = getRandomTheme(); setActiveTheme(t); setHistory([]);
          await saveStoryHistory([], userId);
          await updateUserStats({ storyTheme: t.id }, userId);
        }}]
    );
  };

  const theme = activeTheme || STORY_THEMES[0];

  return (
    <View style={styles.container}>

      {/* ─── 헤더 ─── */}
      <LinearGradient colors={['#4C1D95', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">📖 {nickname}의 모험</Text>
            {theme && (
              <View style={styles.themePill}>
                <Text style={styles.themeText}>{theme.name}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statChip}>
              <Text style={styles.statChipText}>⚡ {points}P</Text>
            </View>
            <View style={[styles.statChip, { marginTop: 5 }]}>
              <Text style={styles.statChipText}>🚶 {accumulatedSteps.toLocaleString()}</Text>
            </View>
            <TouchableOpacity onPress={handleResetStory} style={styles.resetBtn}>
              <Text style={styles.resetText}>🔀 테마 변경</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 챕터 해금 진행 */}
        <View style={styles.progressRow}>
          <View style={styles.chapterCountBox}>
            <Text style={styles.chapterCountNum}>{unlockedChapters}</Text>
            <Text style={styles.chapterCountLabel}>해금 챕터</Text>
          </View>
          <View style={styles.progressBarWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, {
                width: `${Math.min(100, ((accumulatedSteps % STEPS_PER_CHAPTER) / STEPS_PER_CHAPTER) * 100)}%`
              }]} />
            </View>
            <Text style={styles.progressHint}>
              {stepsToNext > 0 ? `다음 챕터까지 ${stepsToNext.toLocaleString()}보` : '챕터 해금 가능!'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ─── 스토리 타임라인 ─── */}
      <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent} showsVerticalScrollIndicator={false}>

        {/* 시작 카드 */}
        {history.length === 0 && !isLoading && (
          <View style={styles.startCard}>
            <Text style={styles.startEmoji}>🎲</Text>
            <Text style={styles.startThemeName}>{theme.name}</Text>
            <Text style={styles.startThemeDesc}>{theme.desc}</Text>
            <Text style={styles.startHint}>
              {accumulatedSteps >= STEPS_PER_CHAPTER
                ? '첫 챕터를 시작할 수 있습니다!'
                : `첫 챕터까지 ${stepsToNext.toLocaleString()}보 남았어요`}
            </Text>
            {accumulatedSteps >= STEPS_PER_CHAPTER && (
              <TouchableOpacity onPress={() => handleUnlockNextStory('', 0)} activeOpacity={0.85}>
                <LinearGradient colors={['#7C3AED', '#4C1D95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startBtn}>
                  <Text style={styles.startBtnText}>🚀 이야기 시작!</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 챕터 카드 */}
        {history.map((story, index) => (
          <View key={story.id} style={styles.chapterCard}>
            {/* 왼쪽 타임라인 선 */}
            <View style={styles.timelineLine} />

            {/* 챕터 번호 노드 */}
            <LinearGradient colors={['#7C3AED', '#4C1D95']} style={styles.chapterNode}>
              <Text style={styles.chapterNodeText}>{index + 1}</Text>
            </LinearGradient>

            <View style={styles.chapterBody}>
              <Text style={styles.chapterLabel}>Chapter {index + 1}</Text>
              <Text style={styles.storyText}>{story.content}</Text>

              {/* 선택한 행동 */}
              {story.selectedOption && (
                <View style={styles.choiceBox}>
                  <Text style={styles.choiceArrow}>→</Text>
                  <Text style={styles.choiceText}>{story.selectedOption}</Text>
                </View>
              )}

              {/* 마지막 챕터 선택지 */}
              {index === history.length - 1 && story.options && !story.selectedOption && (
                <View style={styles.optionsBox}>
                  <Text style={styles.optionHint}>행동을 선택하세요</Text>
                  
                  {/* 히든 선택지 */}
                  {storyKeys > 0 ? (
                    <TouchableOpacity
                      onPress={handleUseStoryKey}
                      activeOpacity={0.80}
                      style={{ marginBottom: 12 }}
                    >
                      <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.optionBtn, { borderColor: '#FDBA74', borderWidth: 1 }]}
                      >
                        <Text style={styles.optionText}>🔑 [히든] 운명적인 반전 유도하기</Text>
                        <View style={[styles.optionCostChip, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                          <Text style={styles.optionCostText}>열쇠 소모</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => Alert.alert('잠김', '포인트 상점에서 [히든 스토리 열쇠]를 구매하시면 히든 선택지를 사용할 수 있습니다!')}
                      activeOpacity={0.80}
                      style={{ marginBottom: 12, opacity: 0.7 }}
                    >
                      <View style={[styles.optionBtn, { backgroundColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, height: 50, borderRadius: 14, alignItems: 'center' }]}>
                        <Text style={[styles.optionText, { color: '#64748B' }]}>🔒 [히든] 열쇠로 히든 스토리 열기</Text>
                        <View style={[styles.optionCostChip, { backgroundColor: '#CBD5E1' }]}>
                          <Text style={[styles.optionCostText, { color: '#64748B' }]}>열쇠 필요</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}

                  {story.options.map((opt, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleUnlockNextStory(opt.text, opt.costPoints)}
                      activeOpacity={0.80}
                      style={{ marginBottom: 8 }}
                    >
                      <LinearGradient
                        colors={['#2563EB', '#06B6D4']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.optionBtn}
                      >
                        <Text style={styles.optionText}>{opt.text}</Text>
                        <View style={styles.optionCostChip}>
                          <Text style={styles.optionCostText}>⚡ {opt.costPoints}P</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ))}

        {/* 로딩 */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>AI가 다음 이야기를 쓰고 있어요...</Text>
          </View>
        )}

        {/* 다음 챕터 패널 */}
        {!isLoading && history.length > 0 && history[history.length - 1].selectedOption && (
          <View style={styles.nextPanel}>
            {canWriteNextChapter ? (
              <TouchableOpacity onPress={() => handleUnlockNextStory('', 0)} activeOpacity={0.85}>
                <LinearGradient colors={['#22C55E', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>📖 다음 챕터 읽기</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.lockedCard}>
                <Text style={styles.lockedIcon}>🔒</Text>
                <Text style={styles.lockedTitle}>다음 챕터 잠김</Text>
                <Text style={styles.lockedDesc}>{stepsToNext.toLocaleString()}보를 더 걸면 해금됩니다</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },

  /* 헤더 */
  header: {
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 42,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.4 },
  themePill: { backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  themeText: { fontSize: 11, color: '#E0F2FE', fontWeight: '800' },
  headerStats: { alignItems: 'flex-end' },
  statChip: { backgroundColor: 'rgba(255,255,255,0.20)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14 },
  statChipText: { fontSize: 13, color: '#FFFFFF', fontWeight: '800' },
  resetBtn: { marginTop: 8 },
  resetText: { fontSize: 11, color: '#E0F2FE', fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chapterCountBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14 },
  chapterCountNum: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  chapterCountLabel: { fontSize: 10, color: '#E0F2FE', fontWeight: '700' },
  progressBarWrap: { flex: 1 },
  progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 4, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', backgroundColor: '#BAE6FD', borderRadius: 4 },
  progressHint: { fontSize: 11, color: '#E0F2FE', fontWeight: '700' },

  /* 타임라인 */
  timeline: { flex: 1, marginTop: -24 },
  timelineContent: { paddingVertical: 20, paddingHorizontal: 16, paddingBottom: 120 },

  /* 시작 카드 */
  startCard: {
    backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#2563EB', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5, borderColor: '#EFF6FF',
  },
  startEmoji: { fontSize: 56, marginBottom: 12 },
  startThemeName: { fontSize: 22, fontWeight: '900', color: '#1C1C28', marginBottom: 6, letterSpacing: -0.5 },
  startThemeDesc: { fontSize: 13, color: '#8A8A9A', textAlign: 'center', lineHeight: 21, marginBottom: 16, fontWeight: '500' },
  startHint: { fontSize: 13, color: '#2563EB', fontWeight: '700', marginBottom: 20, textAlign: 'center', letterSpacing: -0.2 },
  startBtn: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 38 },
  startBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

  /* 챕터 카드 */
  chapterCard: { flexDirection: 'row', marginBottom: 6, paddingLeft: 8 },
  timelineLine: {
    position: 'absolute', left: 28, top: 32, bottom: -20,
    width: 2.5, backgroundColor: '#EFF6FF',
  },
  chapterNode: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginTop: 0, flexShrink: 0,
    shadowColor: '#2563EB', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chapterNodeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  chapterBody: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24,
    padding: 20, marginBottom: 16,
    shadowColor: '#2563EB', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1.5, borderColor: '#EFF6FF',
  },
  chapterLabel: { fontSize: 11, fontWeight: '800', color: '#60A5FA', marginBottom: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  storyText: { fontSize: 15, lineHeight: 28, color: '#2D2D3A', fontWeight: '500' },

  /* 선택 표시 */
  choiceBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 16, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12,
  },
  choiceArrow: { fontSize: 16, color: '#2563EB', fontWeight: '900' },
  choiceText: { flex: 1, fontSize: 13, color: '#1E40AF', fontWeight: '700', lineHeight: 20 },

  /* 선택지 */
  optionsBox: { marginTop: 18, borderTopWidth: 1.5, borderTopColor: '#EFF6FF', paddingTop: 16 },
  optionHint: { fontSize: 12, color: '#A4A4B4', marginBottom: 12, fontWeight: '700', letterSpacing: 0.2 },
  optionBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionText: { fontSize: 14, color: '#FFFFFF', fontWeight: '800', flex: 1, lineHeight: 19 },
  optionCostChip: { backgroundColor: 'rgba(255,255,255,0.22)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, marginLeft: 8 },
  optionCostText: { fontSize: 11, color: '#FFFFFF', fontWeight: '800' },

  /* 로딩 */
  loadingBox: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { fontSize: 13, color: '#A4A4B4', marginTop: 12, fontWeight: '600' },

  /* 다음 챕터 */
  nextPanel: { marginTop: 4, marginBottom: 10 },
  nextBtn: {
    borderRadius: 18, height: 54, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563EB', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  nextBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  lockedCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EFF6FF', borderStyle: 'dashed',
  },
  lockedIcon: { fontSize: 32, marginBottom: 10 },
  lockedTitle: { fontSize: 16, fontWeight: '900', color: '#6B6B80', marginBottom: 5, letterSpacing: -0.3 },
  lockedDesc: { fontSize: 13, color: '#2563EB', fontWeight: '700' },

});
