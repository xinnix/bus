/**
 * 微信支付：调起 prepay + requestPayment，供订单列表/详情复用。
 * 浏览器 H5 无微信支付运行时：走后端模拟支付（仅 NODE_ENV!==production 开放）。
 */
import { orderApi } from '@/api/ticketing';

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
  // #endif

  // #ifdef H5
  await orderApi.mockPay(orderId);
  // #endif
}
