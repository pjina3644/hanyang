import * as SMS from 'expo-sms';

// 목표 미달성 시 발송될 랜덤 경고 메시지 풀
const WARNING_MESSAGES = [
  "🚨 [걸음수 경고] 오늘 운동 목표 달성에 실패했습니다! 제 게으름을 널리 퍼뜨려주세요... 🐷",
  "🐖 꿀꿀... 오늘 걷기 목표를 채우지 못했습니다. 내일은 꼭 움직이겠습니다! 감시 부탁드려요.",
  "🏃‍♂️ 활동량 부족 감지! 오늘의 걷기 목표를 달성하지 못해 자동 경고 메시지가 전송되었습니다. 저 좀 혼내주세요!",
  "📢 [공지] 오늘의 목표 걸음수 미달성! 저 대신 건강하게 활동해 주세요. 다음엔 꼭 성공하겠습니다!"
];

/**
 * 저장된 연락처 목록 중에서 무작위로 수신인을 골라 경고 SMS를 팝업합니다.
 * @param {Array<string>} phoneNumbers - 등록된 전화번호 목록
 * @returns {Promise<boolean>} 발송 창 오픈 성공 여부
 */
export async function sendRandomWarningSMS(phoneNumbers) {
  try {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.warn("No phone numbers registered for warning SMS.");
      return false;
    }

    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      alert("이 기기에서는 SMS 발송이 지원되지 않습니다.");
      return false;
    }

    // 1. 랜덤 연락처 추출
    const randomIndex = Math.floor(Math.random() * phoneNumbers.length);
    const targetPhoneNumber = phoneNumbers[randomIndex];

    // 2. 랜덤 경고 메시지 추출
    const randomMsgIndex = Math.floor(Math.random() * WARNING_MESSAGES.length);
    const messageContent = WARNING_MESSAGES[randomMsgIndex];

    // 3. SMS 발송 UI 호출 (완전 자동 전송이 아니라 사용자의 '전송' 확인 필요)
    const { result } = await SMS.sendSMSAsync(
      [targetPhoneNumber],
      messageContent
    );

    console.log("SMS 발송 시도 결과:", result);
    return result === 'sent';
  } catch (error) {
    console.error("Failed to trigger warning SMS:", error);
    return false;
  }
}
