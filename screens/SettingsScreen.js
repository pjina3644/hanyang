import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAppSettings, saveAppSettings, getUserStats, updateUserStats } from '../services/firebase';

function getCharPreview(nickname) {
  const n = nickname || '핑키';
  return `돼지${n}  →  인간${n}  →  운동왕${n}  →  존예${n}`;
}

function Avatar({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const colors  = ['#FF4D80', '#7C3AED', '#3B82F6', '#22C55E', '#F59E0B'];
  const color   = colors[name.charCodeAt(0) % colors.length];
  return (
    <View style={[styles.avatar, { backgroundColor: color }]}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const [nickname,      setNickname]      = useState('핑키');
  const [nicknameInput, setNicknameInput] = useState('핑키');
  const [targetSteps,   setTargetSteps]   = useState(10000);
  const [contactsList,  setContactsList]  = useState([]);
  const [manualName,    setManualName]    = useState('');
  const [manualPhone,   setManualPhone]   = useState('');

  // 포인트 샵 및 듀오 정보 상태
  const [points,        setPoints]        = useState(0);
  const [shieldActive,  setShieldActive]  = useState(false);
  const [storyKeys,     setStoryKeys]     = useState(0);
  const [duoName,       setDuoName]       = useState('');
  const [duoPhone,      setDuoPhone]      = useState('');
  const [duoNameInput,  setDuoNameInput]  = useState('');
  const [duoPhoneInput, setDuoPhoneInput] = useState('');

  useEffect(() => {
    getAppSettings().then(s => {
      setTargetSteps(s.targetSteps || 10000);
      setNickname(s.nickname || '핑키');
      setNicknameInput(s.nickname || '핑키');
      setContactsList(s.warningContacts || []);
      setDuoName(s.duoName || '');
      setDuoNameInput(s.duoName || '');
      setDuoPhone(s.duoPhone || '');
      setDuoPhoneInput(s.duoPhone || '');
    });
    getUserStats().then(u => {
      setPoints(u.points || 0);
      setShieldActive(u.shieldActive || false);
      setStoryKeys(u.storyKeys || 0);
    });
  }, []);

  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { Alert.alert('입력 오류', '닉네임을 입력해주세요.'); return; }
    setNickname(trimmed);
    await saveAppSettings({ nickname: trimmed });
    Alert.alert('저장 완료', `닉네임이 '${trimmed}'으로 변경됐습니다!`);
  };

  const handleSaveTarget = async (steps) => {
    setTargetSteps(steps);
    await saveAppSettings({ targetSteps: steps });
    Alert.alert('설정 완료', `목표 걸음수 ${steps.toLocaleString()}보 저장`);
  };

  const handleAddContact = async () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      Alert.alert('입력 오류', '이름과 전화번호를 모두 입력해주세요.'); return;
    }
    if (contactsList.some(c => c.phone === manualPhone.trim())) {
      Alert.alert('중복', '이미 등록된 전화번호입니다.'); return;
    }
    const newContact = { name: manualName.trim(), phone: manualPhone.trim() };
    const updated    = [...contactsList, newContact];
    setContactsList(updated);
    setManualName(''); setManualPhone('');
    await saveAppSettings({ warningContacts: updated });
    Alert.alert('추가 완료', `[${newContact.name}] 님을 경고 수신자로 등록했습니다.`);
  };

  const handleDelete = async (phone) => {
    const updated = contactsList.filter(c => c.phone !== phone);
    setContactsList(updated);
    await saveAppSettings({ warningContacts: updated });
  };

  // 실드 구매 처리
  const handleBuyShield = async () => {
    if (shieldActive) {
      Alert.alert('이미 보유 중', '이미 오늘 활성화된 벌칙 방지 실드가 있습니다!');
      return;
    }
    if (points < 100) {
      Alert.alert('포인트 부족', '실드를 구매하려면 100 포인트가 필요합니다.');
      return;
    }
    const newPoints = points - 100;
    setPoints(newPoints);
    setShieldActive(true);
    await updateUserStats({ points: newPoints, shieldActive: true });
    Alert.alert('구매 성공', '🛡️ 하루 벌칙 방지 실드를 구매하여 오늘 하루 동안 페널티가 면제됩니다!');
  };

  // 히든 스토리 열쇠 구매 처리
  const handleBuyStoryKey = async () => {
    if (points < 150) {
      Alert.alert('포인트 부족', '열쇠를 구매하려면 150 포인트가 필요합니다.');
      return;
    }
    const newPoints = points - 150;
    const newKeys = storyKeys + 1;
    setPoints(newPoints);
    setStoryKeys(newKeys);
    await updateUserStats({ points: newPoints, storyKeys: newKeys });
    Alert.alert('구매 성공', '🔑 히든 스토리 열쇠를 1개 구매했습니다! [스토리] 탭에서 히든 선택지를 선택할 수 있게 됩니다.');
  };

  // 행운의 랜덤 박스 구매 처리
  const handleBuyRandomBox = async () => {
    if (points < 50) {
      Alert.alert('포인트 부족', '랜덤 박스를 구매하려면 50 포인트가 필요합니다.');
      return;
    }
    const cost = 50;
    const rewards = [10, 30, 50, 80, 100, 150, 200];
    const prize = rewards[Math.floor(Math.random() * rewards.length)];
    const newPoints = points - cost + prize;
    setPoints(newPoints);
    await updateUserStats({ points: newPoints });
    
    if (prize > cost) {
      Alert.alert('🎉 대박 당첨!', `축하합니다! 랜덤 박스에서 [${prize} P]가 나왔습니다! (+${prize - cost}P 이득!)`);
    } else if (prize === cost) {
      Alert.alert('본전!', `랜덤 박스에서 [50 P]가 나왔습니다! 본전이네요!`);
    } else {
      Alert.alert('아쉬워요!', `랜덤 박스에서 [${prize} P]가 나왔습니다. 다음 기회에 더 대박을 노려보세요!`);
    }
  };

  // 듀오 연동 등록
  const handleSaveDuo = async () => {
    const trimmedName = duoNameInput.trim();
    const trimmedPhone = duoPhoneInput.trim();
    if (!trimmedName || !trimmedPhone) {
      Alert.alert('입력 오류', '듀오 파트너의 이름과 번호를 모두 입력해 주세요.');
      return;
    }
    setDuoName(trimmedName);
    setDuoPhone(trimmedPhone);
    await saveAppSettings({ duoName: trimmedName, duoPhone: trimmedPhone });
    Alert.alert('연동 완료', `👥 [${trimmedName}] 님과 2인 연대책임 듀오 챌린지를 시작합니다!`);
  };

  // 듀오 연동 해제
  const handleRemoveDuo = async () => {
    setDuoName('');
    setDuoPhone('');
    setDuoNameInput('');
    setDuoPhoneInput('');
    await saveAppSettings({ duoName: '', duoPhone: '' });
    Alert.alert('연동 해제', '듀오 챌린지 연동을 해제했습니다.');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── 헤더 배너 ─── */}
      <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        <Text style={styles.bannerTitle}>⚙️ Settings</Text>
        <View style={styles.bannerPreviewBox}>
          <Text style={styles.bannerPreviewLabel}>캐릭터 이름 미리보기</Text>
          <Text style={styles.bannerPreviewText} numberOfLines={1} adjustsFontSizeToFit>
            {getCharPreview(nickname)}
          </Text>
        </View>
      </LinearGradient>

      {/* ─── 닉네임 ─── */}
      <View style={[styles.section, styles.sectionFirst]}>
        <Text style={styles.sectionTitle}>👤 내 닉네임</Text>
        <Text style={styles.sectionDesc}>설정한 이름으로 캐릭터명이 자동 변경됩니다.</Text>
        <View style={styles.nicknameRow}>
          <TextInput
            style={styles.input}
            placeholder="닉네임 입력"
            placeholderTextColor="#C0C0D0"
            value={nicknameInput}
            onChangeText={setNicknameInput}
            maxLength={10}
          />
          <TouchableOpacity onPress={handleSaveNickname} activeOpacity={0.85}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>저장</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 목표 걸음수 ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 일일 목표 걸음수</Text>
        <Text style={styles.sectionDesc}>만보 달성 기준 (10일→인간 / 30일→운동왕 / 100일→존예)</Text>
        <View style={styles.presetRow}>
          {[5000, 10000, 15000].map(s => {
            const active = targetSteps === s;
            return active ? (
              <TouchableOpacity key={s} onPress={() => handleSaveTarget(s)} activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.presetBtn}>
                  <Text style={styles.presetTextActive}>{s.toLocaleString()}</Text>
                  <Text style={styles.presetUnitActive}>보</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity key={s} onPress={() => handleSaveTarget(s)} activeOpacity={0.85} style={[styles.presetBtn, styles.presetBtnInactive]}>
                <Text style={styles.presetText}>{s.toLocaleString()}</Text>
                <Text style={styles.presetUnit}>보</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── 🛒 포인트 상점 ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛒 포인트 상점</Text>
        <Text style={styles.sectionDesc}>걷기로 모은 포인트로 유용한 아이템을 교환해 보세요. (보유: {points} P)</Text>
        
        <View style={{ gap: 12 }}>
          {/* 아이템 1: 하루 벌칙 방지 실드 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFC', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#EEF2F6' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1C1C28' }}>🛡️ 하루 벌칙 방지 실드</Text>
              <Text style={{ fontSize: 11, color: '#6366F1', marginTop: 4, fontWeight: '700' }}>비용: 100 P | 오늘 하루 페널티 발송 면제</Text>
            </View>
            {shieldActive ? (
              <View style={{ backgroundColor: '#D1FAE5', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#065F46' }}>🛡️ 활성 중</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleBuyShield} activeOpacity={0.85}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>구매</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* 아이템 2: 히든 스토리 열쇠 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFC', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#EEF2F6' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1C1C28' }}>🔑 히든 스토리 열쇠 (보유: {storyKeys}개)</Text>
              <Text style={{ fontSize: 11, color: '#6366F1', marginTop: 4, fontWeight: '700' }}>비용: 150 P | 소설의 히든 루트 해금</Text>
            </View>
            <TouchableOpacity onPress={handleBuyStoryKey} activeOpacity={0.85}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>구매</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* 아이템 3: 행운의 랜덤 박스 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFC', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#EEF2F6' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1C1C28' }}>👟 행운의 랜덤 박스</Text>
              <Text style={{ fontSize: 11, color: '#6366F1', marginTop: 4, fontWeight: '700' }}>비용: 50 P | 10P ~ 최대 200P 당첨 확률!</Text>
            </View>
            <TouchableOpacity onPress={handleBuyRandomBox} activeOpacity={0.85}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>뽑기</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── 👥 2인 연대책임 듀오 챌린지 ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 2인 연대책임 듀오 챌린지</Text>
        <Text style={styles.sectionDesc}>친구와 듀오가 되어 같이 걸으세요! 둘 중 하나라도 낙오 시 등록된 친구의 폰으로도 페널티 문자가 전송됩니다.</Text>
        
        {duoName ? (
          <View style={{ backgroundColor: '#F5EFFB', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#EEF2F6' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 24 }}>👥</Text>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1C1C28' }}>{duoName} 님과 연동 중</Text>
                <Text style={{ fontSize: 12, color: '#8B5CF6', marginTop: 2, fontWeight: '600' }}>{duoPhone}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleRemoveDuo} activeOpacity={0.85} style={{ backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EEF2F6', height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '800' }}>듀오 챌린지 끊기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 0.35 }]}
                placeholder="친구 이름"
                placeholderTextColor="#C0C0D0"
                value={duoNameInput}
                onChangeText={setDuoNameInput}
              />
              <TextInput
                style={[styles.input, { flex: 0.65 }]}
                placeholder="친구 번호"
                placeholderTextColor="#C0C0D0"
                keyboardType="phone-pad"
                value={duoPhoneInput}
                onChangeText={setDuoPhoneInput}
              />
            </View>
            <TouchableOpacity onPress={handleSaveDuo} activeOpacity={0.85}>
              <LinearGradient colors={['#7C3AED', '#A78BFA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>듀오 챌린지 시작하기</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── 경고 연락처 ─── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 경고 연락처</Text>
        <Text style={styles.sectionDesc}>목표 미달 시 이 목록 중 무작위 1명에게 경고 문자가 발송됩니다.</Text>

        {/* 추가 폼 */}
        <View style={styles.addForm}>
          <Text style={styles.formLabel}>연락처 추가</Text>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, styles.inputName]}
              placeholder="이름"
              placeholderTextColor="#C0C0D0"
              value={manualName}
              onChangeText={setManualName}
            />
            <TextInput
              style={[styles.input, styles.inputPhone]}
              placeholder="전화번호"
              placeholderTextColor="#C0C0D0"
              keyboardType="phone-pad"
              value={manualPhone}
              onChangeText={setManualPhone}
            />
            <TouchableOpacity onPress={handleAddContact} activeOpacity={0.85}>
              <LinearGradient colors={['#60A5FA', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
                <Text style={styles.addBtnText}>추가</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* 연락처 목록 */}
        <Text style={styles.listHeader}>등록된 연락처 ({contactsList.length}명)</Text>
        {contactsList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>등록된 연락처가 없습니다</Text>
            <Text style={styles.emptySubText}>위 폼으로 추가해보세요</Text>
          </View>
        ) : (
          contactsList.map((item, idx) => (
            <View key={idx} style={styles.contactItem}>
              <Avatar name={item.name} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.phone)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FAFAFC' },
  container: { paddingBottom: 120 },

  /* 배너 */
  banner: {
    paddingHorizontal: 22, paddingTop: 20, paddingBottom: 42,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginBottom: 14, letterSpacing: -0.4 },
  bannerPreviewBox: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 16, padding: 14 },
  bannerPreviewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginBottom: 4, letterSpacing: 0.2 },
  bannerPreviewText: { fontSize: 13, color: '#FFFFFF', fontWeight: '800', lineHeight: 20 },

  /* 섹션 */
  section: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFFFFF', borderRadius: 28, padding: 22,
    shadowColor: '#6366F1', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5, borderColor: '#EEF2F6',
  },
  sectionFirst: {
    marginTop: -24,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1C1C28', marginBottom: 4 },
  sectionDesc:  { fontSize: 12, color: '#8A8A9A', lineHeight: 18, marginBottom: 16, fontWeight: '500' },

  /* 닉네임 */
  nicknameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, height: 48, borderWidth: 1.5, borderColor: '#EEF2F6',
    borderRadius: 14, paddingHorizontal: 14, fontSize: 14,
    color: '#1C1C28', backgroundColor: '#FAFAFC',
  },
  saveBtn: { height: 48, paddingHorizontal: 22, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  /* 목표 걸음수 */
  presetRow: { flexDirection: 'row', gap: 8 },
  presetBtn: {
    flex: 1, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  presetBtnInactive: { backgroundColor: '#FAFAFC', borderWidth: 1.5, borderColor: '#EEF2F6' },
  presetText:       { fontSize: 15, fontWeight: '800', color: '#A4A4B4' },
  presetUnit:       { fontSize: 11, color: '#B4B4C4', fontWeight: '600' },
  presetTextActive: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  presetUnitActive: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

  /* 연락처 추가 폼 */
  addForm: { marginBottom: 18 },
  formLabel: { fontSize: 12, fontWeight: '800', color: '#8A8A9A', marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  inputName:  { flex: 0.28, height: 46 },
  inputPhone: { flex: 0.48, height: 46 },
  addBtn: { height: 46, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  /* 목록 */
  listHeader: { fontSize: 13, fontWeight: '800', color: '#6B6B80', marginBottom: 12, letterSpacing: -0.2 },
  emptyBox: {
    alignItems: 'center', paddingVertical: 26, backgroundColor: '#FAFAFC', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#EEF2F6', borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: '800', color: '#8A8A9A', marginBottom: 3 },
  emptySubText: { fontSize: 12, color: '#B4B4C4', fontWeight: '600' },

  contactItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1.5, borderBottomColor: '#FAFAFC',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '800', color: '#1C1C28' },
  contactPhone: { fontSize: 12, color: '#8A8A9A', marginTop: 2, fontWeight: '500' },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#FFF0F3', borderWidth: 1, borderColor: '#FFE4EC' },
  deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '800' },
});

