import { Pedometer } from 'expo-sensors';

/**
 * Pedometer 사용 가능 여부를 확인합니다.
 * @returns {Promise<boolean>}
 */
export async function checkPedometerAvailability() {
  try {
    const result = await Pedometer.isAvailableAsync();
    return result;
  } catch (error) {
    console.error("Pedometer availability check failed:", error);
    return false;
  }
}

/**
 * 실시간 걸음수 측정을 시작합니다.
 * @param {function} callback - 걸음수 업데이트 시 호출할 콜백 함수
 * @returns {Pedometer.Subscription | null}
 */
export function startStepCountSubscription(callback) {
  try {
    const subscription = Pedometer.watchStepCount((result) => {
      callback(result.steps);
    });
    return subscription;
  } catch (error) {
    console.error("Failed to start step count subscription:", error);
    return null;
  }
}

/**
 * 특정 시간대 사이의 과거 걸음수 데이터를 가져옵니다.
 * @param {Date} start - 시작 시점
 * @param {Date} end - 종료 시점
 * @returns {Promise<number>}
 */
export async function getStepCountRange(start, end) {
  try {
    const isAvailable = await checkPedometerAvailability();
    if (!isAvailable) {
      console.warn("Pedometer is not available on this device.");
      return 0;
    }
    const result = await Pedometer.getStepCountAsync(start, end);
    return result ? result.steps : 0;
  } catch (error) {
    console.error("Failed to fetch historical step count:", error);
    return 0;
  }
}
