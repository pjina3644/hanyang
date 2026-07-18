import * as SMS from 'expo-sms';

const WARNING_MESSAGES = [
  "🚨 [걸음수 경고] 오늘 운동 목표 달성에 실패했습니다! 제 게으름을 널리 퍼뜨려주세요... 🐷",
  "🐖 꿀꿀... 오늘 걷기 목표를 채우지 못했습니다. 내일은 꼭 움직이겠습니다! 감시 부탁드려요.",
  "🏃‍♂️ 활동량 부족 감지! 오늘 걷기 목표를 달성하지 못해 자동 경고 메시지가 전송되었습니다. 저 좀 혼내주세요!",
  "📢 [공지] 오늘의 목표 걸음수 미달성! 저 대신 건강하게 활동해 주세요. 다음엔 꼭 성공하겠습니다!",
];

/**
 * 연락처 목록 중 무작위 1명에게 경고 SMS 앱을 엽니다.
 * @param {Array<string | {name:string, phone:string}>} contacts - 전화번호 문자열 또는 연락처 객체 배열
 * @returns {Promise<boolean>}
 */
export async function sendRandomWarningSMS(contacts, customMessage = null) {
  try {
    if (!contacts || contacts.length === 0) {
      console.warn('No contacts registered for warning SMS.');
      return false;
    }

    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      alert('이 기기에서는 SMS 발송이 지원되지 않습니다.');
      return false;
    }

    // 객체 배열이든 문자열 배열이든 전화번호 문자열만 추출하고 유효한 것만 사용
    const phoneNumbers = contacts
      .map(c => {
        if (typeof c === 'string') return c.trim();
        if (c && typeof c.phone === 'string') return c.phone.trim();
        return null;
      })
      .filter(Boolean);

    if (phoneNumbers.length === 0) {
      console.warn('No valid phone numbers found in contacts.');
      alert('유효한 전화번호가 없습니다. 설정에서 연락처를 다시 등록해주세요.');
      return false;
    }

    const targetPhone = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
    const message = customMessage || WARNING_MESSAGES[Math.floor(Math.random() * WARNING_MESSAGES.length)];

    const { result } = await SMS.sendSMSAsync([targetPhone], message);
    console.log('SMS 발송 시도 결과:', result);
    return result === 'sent';
  } catch (error) {
    console.error('Failed to trigger warning SMS:', error);
    return false;
  }
}
