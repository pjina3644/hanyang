import { Pedometer } from 'expo-sensors';

/**
 * 만보기 권한을 요청하고 사용 가능 여부를 반환합니다.
 * @returns {Promise<boolean>}
 */
export async function checkPedometerAvailability() {
  try {
    const { status } = await Pedometer.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Pedometer permission denied');
      return false;
    }
    return await Pedometer.isAvailableAsync();
  } catch (error) {
    console.error('Pedometer availability check failed:', error);
    return false;
  }
}

/**
 * 실시간 걸음수 구독 (앱 실행 후 증가분을 콜백으로 전달)
 * @param {function} callback - (steps: number) 구독 시작 이후 누적 걸음수
 * @returns {Pedometer.Subscription | null}
 */
export function startStepCountSubscription(callback) {
  try {
    return Pedometer.watchStepCount(({ steps }) => callback(steps));
  } catch (error) {
    console.error('Failed to start step count subscription:', error);
    return null;
  }
}

/**
 * 특정 시간 범위의 걸음수를 가져옵니다 (iOS HealthKit / Android 기록).
 * @param {Date} start
 * @param {Date} end
 * @returns {Promise<number>}
 */
export async function getStepCountRange(start, end) {
  try {
    const result = await Pedometer.getStepCountAsync(start, end);
    return result ? result.steps : 0;
  } catch (error) {
    console.error('Failed to fetch step count range:', error);
    return 0;
  }
}
