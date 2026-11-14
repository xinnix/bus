/**
 * 微信支付：调起 prepay + requestPayment，供订单列表/详情复用。
 * 浏览器 H5 无微信支付运行时：走后端模拟支付（仅 NODE_ENV!==production 开放）。
 * P0.5：支付成功后 best-effort 申请「出票通知」订阅授权（未配置模板/用户拒绝均静默）。
 */
import { orderApi, subscribeApi } from '@/api/ticketing';

/** 申请订阅授权（best-effort）：模板未启用/未配置/用户拒绝都不报错 */
async function requestSubscribe(templateId?: string | null): Promise<void> {
  // #ifdef MP-WEIXIN
  if (!templateId) return;
  try {
    await new Promise<void>((resolve) => {
      uni.requestSubscribeMessage({
        tmplIds: [templateId],
        complete: () => resolve(),
      });
    });
  } catch {
    // 静默：授权弹窗失败不影响主流程
  }
  // #endif
}

/** 支付成功后的出票通知订阅授权 */
export async function requestPaidSubscribe(): Promise<void> {
  try {
    const res = await subscribeApi.templates();
    if (!res.data?.enabled) return;
    await requestSubscribe(res.data.paidTemplateId);
  } catch {
    // 静默
  }
}

/** 发车提醒订阅授权（车票页入口用） */
export async function requestDepartureSubscribe(): Promise<'granted' | 'rejected' | 'off'> {
  try {
    const res = await subscribeApi.templates();
    if (!res.data?.enabled || !res.data.departureTemplateId) return 'off';
    // #ifndef MP-WEIXIN
    return 'off';
    // #endif
    // #ifdef MP-WEIXIN
    return await new Promise((resolve) => {
      uni.requestSubscribeMessage({
        tmplIds: [res.data.departureTemplateId as string],
        success: (r: any) => {
          const v = r?.[res.data.departureTemplateId as string];
          resolve(v === 'accept' ? 'granted' : 'rejected');
        },
        fail: () => resolve('rejected'),
      });
    });
    // #endif
  } catch {
    return 'off';
  }
}

export async function requestWechatPay(orderId: string): Promise<void> {
  // #ifdef MP-WEIXIN
  const prepay = await orderApi.prepay(orderId);
  const pay = prepay.data;
  await new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: pay.timeStamp,
      nonceStr: pay.nonceStr,
      package: pay.package,
      signType: pay.signType as any,
      paySign: pay.paySign,
      success: () => resolve(),
      fail: (err) => reject(err),
    });
  });
  await requestPaidSubscribe();
  // #endif

  // #ifdef H5
  await orderApi.mockPay(orderId);
  await requestPaidSubscribe();
  // #endif
}
