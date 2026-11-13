/**
 * 核销员身份（手机号一致性绑定）：
 * 登录后/首页展示时静默调 identity 接口，识别结果落 storage 供入口展示。
 */
import { checkerApi, type CheckerIdentity } from '@/api/ticketing';

const STORAGE_KEY = 'checkerIdentity';

/** 调后端检查并绑定身份（openid 匹配或手机号一致时回填），结果写入 storage */
export async function refreshCheckerIdentity(): Promise<CheckerIdentity | null> {
  try {
    const res = await checkerApi.identity();
    const checker = res.data?.isChecker ? (res.data.checker ?? null) : null;
    if (checker) {
      uni.setStorageSync(STORAGE_KEY, checker);
    } else {
      uni.removeStorageSync(STORAGE_KEY);
    }
    return checker;
  } catch {
    // 静默失败：未登录/网络异常时不影响正常使用
    return null;
  }
}

export function getCheckerIdentity(): CheckerIdentity | null {
  return (uni.getStorageSync(STORAGE_KEY) as CheckerIdentity) || null;
}

export function clearCheckerIdentity() {
  uni.removeStorageSync(STORAGE_KEY);
}
