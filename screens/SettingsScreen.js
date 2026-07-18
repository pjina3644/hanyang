import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAppSettings, saveAppSettings } from '../services/firebase';

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

  useEffect(() => {
    getAppSettings().then(s => {
      setTargetSteps(s.targetSteps || 10000);
      setNickname(s.nickname || '핑키');
      setNicknameInput(s.nickname || '핑키');
      setContactsList(s.warningContacts || []);
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── 헤더 배너 ─── */}
      <LinearGradient colors={['#FF4D80', '#FF8FB1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        <Text style={styles.bannerTitle}>⚙️ 설정</Text>
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
            <LinearGradient colors={['#FF4D80', '#FF8FB1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
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
                <LinearGradient colors={['#FF4D80', '#FF8FB1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.presetBtn}>
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
    shadowColor: '#FF4D80', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1.5, borderColor: '#FFF0F3',
  },
  sectionFirst: {
    marginTop: -24,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1C1C28', marginBottom: 4 },
  sectionDesc:  { fontSize: 12, color: '#8A8A9A', lineHeight: 18, marginBottom: 16, fontWeight: '500' },

  /* 닉네임 */
  nicknameRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, height: 48, borderWidth: 1.5, borderColor: '#FFE4EC',
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
  presetBtnInactive: { backgroundColor: '#FAFAFC', borderWidth: 1.5, borderColor: '#FFE4EC' },
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
    borderWidth: 1.5, borderColor: '#FFEBF0', borderStyle: 'dashed',
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

