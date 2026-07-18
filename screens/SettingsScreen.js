import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Alert, FlatList } from 'react-native';
import * as Contacts from 'expo-contacts';
import { getAppSettings, saveAppSettings } from '../services/firebase';

export default function SettingsScreen() {
  const [targetSteps, setTargetSteps] = useState(5000);
  const [contactsList, setContactsList] = useState([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getAppSettings();
      setTargetSteps(settings.targetSteps);
      setContactsList(settings.warningContacts || []);
    };
    loadSettings();
  }, []);

  const handleSaveTargetSteps = async (steps) => {
    setTargetSteps(steps);
    await saveAppSettings({ targetSteps: steps });
    Alert.alert("설정 완료", `목표 걸음수가 ${steps}보로 저장되었습니다.`);
  };

  // 주소록에서 연락처 가져오기
  const handleImportContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        });

        if (data.length > 0) {
          // 간이 선택창 구현 (실제 프로덕션은 리스트 모달을 띄워야 하지만,
          // 해커톤 시연용으로 가장 첫 연락처를 샘플로 추가하거나 무작위로 하나 등록해 주는 방식으로 구현)
          // 여기서는 사용자 친화적으로 랜덤 샘플을 추가하거나 선택하는 안내 팝업을 제공
          const validContacts = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
          
          if (validContacts.length === 0) {
            Alert.alert("연락처 없음", "휴대폰에 저장된 전화번호가 없습니다.");
            return;
          }

          // 무작위로 연락처 중 하나를 추가 (시연용으로 간편)
          const randomContact = validContacts[Math.floor(Math.random() * validContacts.length)];
          const name = randomContact.name;
          const phone = randomContact.phoneNumbers[0].number;

          addContactToList(name, phone);
        } else {
          Alert.alert("연락처 부재", "접근할 수 있는 연락처가 없습니다.");
        }
      } else {
        Alert.alert("권한 거부됨", "연락처 접근 권한이 필요합니다. 수동 입력을 이용해 주세요.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("오류", "연락처를 가져오는 데 실패했습니다.");
    }
  };

  // 수동 연락처 추가
  const handleAddManual = () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      Alert.alert("입력 오류", "이름과 전화번호를 모두 입력해 주세요.");
      return;
    }
    addContactToList(manualName, manualPhone);
    setManualName('');
    setManualPhone('');
  };

  const addContactToList = async (name, phone) => {
    // 중복 체크
    if (contactsList.some(c => c.phone === phone)) {
      Alert.alert("등록 완료", "이미 등록된 연락처입니다.");
      return;
    }

    const newContact = { name, phone };
    const updated = [...contactsList, newContact];
    setContactsList(updated);
    
    // DB 저장
    await saveAppSettings({ warningContacts: updated });
    Alert.alert("연락처 추가", `[${name}] 님이 경고 수신자로 등록되었습니다.`);
  };

  // 연락처 삭제
  const handleDeleteContact = async (phone) => {
    const updated = contactsList.filter(c => c.phone !== phone);
    setContactsList(updated);
    await saveAppSettings({ warningContacts: updated });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>⚙️ 시스템 설정</Text>

      {/* 목표 걸음수 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 일일 목표 걸음수</Text>
        <Text style={styles.sectionDesc}>당일에 이 걸음수를 달성하지 못하면 저녁에 경고 문자가 발송됩니다.</Text>
        
        <View style={styles.presetRow}>
          {[3000, 5000, 10000].map((steps) => (
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

      {/* 연락처 관리 섹션 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 미달성 시 알림 연락처</Text>
        <Text style={styles.sectionDesc}>목표 미달 시 이 목록 중 무작위 1명에게 문자 메시지가 발송됩니다.</Text>

        <TouchableOpacity style={styles.importBtn} onPress={handleImportContact}>
          <Text style={styles.importBtnText}>📱 주소록에서 가져오기</Text>
        </TouchableOpacity>

        {/* 수동 추가 폼 */}
        <View style={styles.manualForm}>
          <Text style={styles.formLabel}>직접 추가 (권한 거부 또는 시뮬레이터용)</Text>
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

        {/* 등록된 연락처 리스트 */}
        <Text style={styles.listHeader}>등록된 연락처 ({contactsList.length}명)</Text>
        {contactsList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>등록된 연락처가 없습니다. 경고 발송을 위해 최소 한 개의 연락처를 등록해 주세요.</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 20,
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#868E96',
    lineHeight: 18,
    marginBottom: 15,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetBtn: {
    flex: 0.31,
    height: 40,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  presetBtnActive: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF8787',
  },
  presetText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  presetTextActive: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  importBtn: {
    backgroundColor: '#E8F7F0',
    height: 45,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  importBtnText: {
    color: '#2B8A3E',
    fontWeight: 'bold',
    fontSize: 14,
  },
  manualForm: {
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 15,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  addBtn: {
    flex: 0.16,
    height: 40,
    backgroundColor: '#FF8787',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  listHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 15,
  },
  emptyBox: {
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#868E96',
    textAlign: 'center',
    lineHeight: 18,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  contactName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  contactPhone: {
    fontSize: 12,
    color: '#868E96',
    marginTop: 2,
  },
  deleteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FFE3E3',
  },
  deleteBtnText: {
    fontSize: 11,
    color: '#F03E3E',
    fontWeight: 'bold',
  },
});
