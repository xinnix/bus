/**
 * RefundService 跨层桥（同 settings.service 的既有模式）：
 * Nest 侧在 main.ts 启动时注入单例；PaymentModule 回调与 tRPC 过程经此获取，
 * 避免 PaymentModule ↔ RefundModule 循环依赖。
 */
import type { RefundService } from './refund.service';

let refundServiceInstance: RefundService | null = null;

export const setRefundService = (service: RefundService) => {
  refundServiceInstance = service;
};

export const getRefundService = (): RefundService => {
  if (!refundServiceInstance) {
    throw new Error('RefundService 尚未注入（main.ts 启动完成前不可用）');
  }
  return refundServiceInstance;
};
