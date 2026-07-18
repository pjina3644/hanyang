import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput,
  ScrollView, Alert
} from 'react-native';
import { getAppSettings, saveAppSettings } from '../services/firebase';

export default function SettingsScreen() {
  const [nickname, setNickname] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [targetSteps, setTargetSteps] = useState(10000);
  const [contactsList, setContactsList] = useState([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getAppSettings();
      setTargetSteps(settings.targetSteps || 10000);
      setNickname(settings.nickname || '핑키');
      setNicknameInput(settings.nickname || '핑키');
      setContactsList(settings.warningContacts || []);
    };
    loadSettings();
  }, []);

  const handleSaveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      Alert.alert('입력 오류', '닉네임을 입력해주세요.');
      return;
    }
    setNickname(trimmed);
    await saveAppSettings({ nickname: trimmed });
    Alert.alert('저장 완료', `닉네임이 '${trimmed}'(으)로 설정되었습니다!\n캐릭터 이름도 자동으로 바뀝니다.`);
  };

  const handleSaveTargetSteps = async (steps) => {
    setTargetSteps(steps);
    await saveAppSettings({ targetSteps: steps });
    Alert.alert('설정 완료', `목표 걸음수가 ${steps.toLocaleString()}보로 저장되었습니다.`);
  };

  const handleAddManual = () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      Alert.alert('입력 오류', '이름과 전화번호를 모두 입력해주세요.');
      return;
    }
    addContactToList(manualName.trim(), manualPhone.trim());
    setManualName('');
    setManualPhone('');
  };

  const addContactToList = async (name, phone) => {
    if (contactsList.some(c => c.phone === phone)) {
      Alert.alert('중복', '이미 등록된 전화번호입니다.');
      return;
    }
    const newContact = { name, phone };
    const updated = [...contactsList, newContact];
    setContactsList(updated);
    await saveAppSettings({ warningContacts: updated });
    Alert.alert('추가 완료', `[${name}] 님이 경고 수신자로 등록되었습니다.`);
  };

  const handleDeleteContact = async (phone) => {
    const updated = contactsList.filter(c => c.phone !== phone);
    setContactsList(updated);
    await saveAppSettings({ warningContacts: updated });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚙️ 설정</Text>

      {/* 닉네임 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 내 닉네임</Text>
        <Text style={styles.sectionDesc}>
          캐릭터 이름이 '돼지{nickname}', '인간{nickname}', '존예{nickname}' 형태로 바뀝니다.
        </Text>
        <View style={styles.nicknameRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="닉네임 입력"
            value={nicknameInput}
            onChangeText={setNicknameInput}
            maxLength={10}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNickname}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.previewText}>
          현재 캐릭터명 미리보기: <Text style={styles.previewName}>돼지{nickname} → 인간{nickname} → 운동왕{nickname} → 존예{nickname}</Text>
        </Text>
      </View>

      {/* 목표 걸음수 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 일일 목표 걸음수</Text>
        <Text style={styles.sectionDesc}>
          만보(10,000보)를 기준으로 캐릭터가 레벨업합니다.{'\n'}
          달성 일수: 10일 → 인간 / 30일 → 운동왕 / 100일 → 존예
        </Text>
        <View style={styles.presetRow}>
          {[5000, 10000, 15000].map((steps) => (
            <TouchableOpacity
              key={steps}
              style={[styles.presetBtn, targetSteps === steps && styles.presetBtnActive]}
              onPress={() => handleSaveTargetSteps(steps)}
            >
              <Text style={[styles.presetText, targetSteps === steps && styles.presetTextActive]}>
                {steps.toLocaleString()}보
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 연락처 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 미달성 경고 연락처</Text>
        <Text style={styles.sectionDesc}>목표 미달 시 이 목록 중 무작위 1명에게 경고 문자가 발송됩니다.</Text>

        <View style={styles.manualForm}>
          <Text style={styles.formLabel}>연락처 직접 추가</Text>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 0.3 }]}
              placeholder="이름"
              value={manualName}
              onChangeText={setManualName}
            />
            <TextInput
              style={[styles.input, { flex: 0.5 }]}
              placeholder="전화번호"
              keyboardType="phone-pad"
              value={manualPhone}
              onChangeText={setManualPhone}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddManual}>
              <Text style={styles.addBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.listHeader}>등록된 연락처 ({contactsList.length}명)</Text>
        {contactsList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>등록된 연락처가 없습니다.</Text>
          </View>
        ) : (
          contactsList.map((item, idx) => (
            <View key={idx} style={styles.contactItem}>
              <View>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteContact(item.phone)}>
                <Text style={styles.deleteBtnText}>제거</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#343A40', marginBottom: 20 },

  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#495057', marginBottom: 6 },
  sectionDesc: { fontSize: 12, color: '#868E96', lineHeight: 18, marginBottom: 14 },

  nicknameRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  previewText: { fontSize: 12, color: '#868E96' },
  previewName: { color: '#FF6B6B', fontWeight: 'bold' },

  presetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  presetBtn: {
    flex: 0.31, height: 42, borderWidth: 1, borderColor: '#E9ECEF',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  presetBtnActive: { backgroundColor: '#FFF5F5', borderColor: '#FF8787' },
  presetText: { fontSize: 13, color: '#495057', fontWeight: '500' },
  presetTextActive: { color: '#FF6B6B', fontWeight: 'bold' },

  manualForm: { marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#495057', marginBottom: 8 },
  formRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    height: 42, borderWidth: 1, borderColor: '#CED4DA',
    borderRadius: 10, paddingHorizontal: 12, fontSize: 13, backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    height: 42, backgroundColor: '#FF8787', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  addBtn: {
    flex: 0.16, height: 42, backgroundColor: '#4DABF7',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },

  listHeader: { fontSize: 13, fontWeight: 'bold', color: '#495057', marginBottom: 10 },
  emptyBox: { padding: 16, backgroundColor: '#F8F9FA', borderRadius: 10, alignItems: 'center' },
  emptyText: { fontSize: 12, color: '#868E96' },
  contactItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F3F5',
  },
  contactName: { fontSize: 14, fontWeight: 'bold', color: '#495057' },
  contactPhone: { fontSize: 12, color: '#868E96', marginTop: 2 },
  deleteBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#FFE3E3' },
  deleteBtnText: { fontSize: 11, color: '#F03E3E', fontWeight: 'bold' },
});
