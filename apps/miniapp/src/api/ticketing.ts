/**
 * P0 票务 API
 */
import { http } from '@/utils/http';

export interface Line {
  id: string;
  name: string;
  startCity: string;
  endCity: string;
}

export interface Trip {
  id: string;
  lineId: string;
  serviceDate: string;
  departureTime: string;
  priceCents: number;
  totalSeats: number;
  soldSeats: number;
  status: string;
  line?: Line;
  /** 是否可购（发车后 30 分钟停售）；班次列表接口下发 */
  purchasable?: boolean;
}

export interface Ticket {
  id: string;
  ticketNo: string;
  passengerName: string;
  checkCode: string;
  status: string;
  priceCents?: number;
  qrToken?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  contactName: string;
  contactPhone: string;
  ticketCount: number;
  totalAmountCents: number;
  payStatus: string;
  orderStatus: string;
  createdAt: string;
  line?: Line;
  trip?: Trip;
  tickets?: Ticket[];
  payment?: { status: string; amountCents: number } | null;
  payParams?: any;
}

export const lineApi = {
  list: () => http.get<Line[]>('/lines'),
};

/** 核销员身份（脱敏后）：手机号一致性绑定的识别结果 */
export interface CheckerIdentity {
  id: string;
  name: string;
  phone: string;
}

/** 核销员端班次运营看板行：已售/余票/已核销 + 可购状态 */
export interface CheckerTrip {
  id: string;
  lineName: string;
  serviceDate: string;
  departureTime: string;
  priceCents: number;
  totalSeats: number;
  soldSeats: number;
  remainingSeats: number;
  status: string;
  checkedInCount: number;
  purchasable: boolean;
}

export const tripApi = {
  list: (lineId: string, date: string) =>
    http.get<{ trips: Trip[]; stations: any[] }>(
      `/lines/${lineId}/trips`,
      { date },
      { showLoading: false },
    ),
};

export const orderApi = {
  create: (
    data: {
      tripId: string;
      boardingStationId?: string;
      alightingStationId?: string;
      contactName: string;
      contactPhone: string;
      ticketCount: number;
      passengerNames?: string[];
    },
    idempotencyKey?: string,
  ) =>
    http.post<Order>('/orders', data, {
      showLoading: true,
      loadingText: '正在下单...',
      // 幂等键：同一提交意图（含网络重试/连点）只创建一单
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }),

  list: (page = 1, pageSize = 20) =>
    http.get<Order[]>('/orders', { page, pageSize }, { showLoading: false }),

  detail: (id: string) => http.get<Order>(`/orders/${id}`, undefined, { showLoading: false }),

  // 车票微信小程序码（scene=核销码，核票员微信扫一扫直达核验）；失败时前端回退本地矩阵二维码
  wxacode: (orderId: string, ticketId: string) =>
    http.get<{ image: string }>(`/orders/${orderId}/tickets/${ticketId}/wxacode`, undefined, {
      showLoading: false,
    }),

  prepay: (id: string) =>
    http.post<{
      paymentNo: string;
      timeStamp: string;
      nonceStr: string;
      package: string;
      signType: string;
      paySign: string;
    }>(`/orders/${id}/prepay`, {}, { showLoading: true, loadingText: '正在发起支付...' }),

  // 模拟支付（后端仅 NODE_ENV!==production 开放；浏览器 H5 无微信支付运行时时联调用）
  mockPay: (id: string) =>
    http.post<{ handled: boolean }>(
      `/orders/${id}/mock-pay`,
      {},
      { showLoading: true, loadingText: '模拟支付中...' },
    ),
};

// ====================
// P0.5 退票 / 改签 / 订阅消息
// ====================

export interface RefundRecord {
  id: string;
  refundNo: string;
  amountCents: number;
  feeCents: number;
  status: string;
  operatorType: string;
  reason?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export const refundApi = {
  request: (orderId: string, ticketIds: string[], reason?: string) =>
    http.post<RefundRecord>(
      `/orders/${orderId}/refunds`,
      { ticketIds, reason },
      { showLoading: true, loadingText: '退款提交中...' },
    ),

  list: (orderId: string) =>
    http.get<RefundRecord[]>(`/orders/${orderId}/refunds`, undefined, { showLoading: false }),
};

export interface SubscribeTemplates {
  enabled: boolean;
  paidTemplateId?: string | null;
  departureTemplateId?: string | null;
}

export const subscribeApi = {
  templates: () =>
    http.get<SubscribeTemplates>('/subscribe/templates', undefined, { showLoading: false }),
};

export const checkerApi = {
  login: (phone: string, password: string) =>
    http.post<{ accessToken: string; checker: any }>(
      '/checker/login',
      { phone, password },
      { showLoading: true },
    ),

  // 身份检查 + 手机号一致性绑定（http 默认携带乘客 token）
  identity: () =>
    http.get<{ isChecker: boolean; checker?: CheckerIdentity }>('/checker/identity', undefined, {
      showLoading: false,
    }),

  // 已绑定 openid 的核销员免密登录，签发 checker token
  openidLogin: () =>
    http.post<{ accessToken: string; checker: CheckerIdentity }>(
      '/checker/openid-login',
      {},
      {
        showLoading: false,
      },
    ),

  verify: (data: { code?: string; qrToken?: string }) =>
    http.post<{ success: boolean; message: string; ticket?: any }>('/checker/verify', data, {
      showLoading: true,
      loadingText: '核销中...',
      header: checkerAuthHeader(),
    }),

  records: (params?: { tripId?: string; date?: string }) =>
    http.get<any[]>('/checker/records', params, {
      showLoading: false,
      header: checkerAuthHeader(),
    }),

  // 班次运营看板：按日期查班次已售/余票/已核销（date 缺省为今天）
  trips: (date?: string) =>
    http.get<CheckerTrip[]>(
      '/checker/trips',
      { date },
      {
        showLoading: false,
        header: checkerAuthHeader(),
      },
    ),

  // 调整班次总票数（余票 = 总票数 - 已售 自动变化，不得低于已售）
  adjustSeats: (tripId: string, totalSeats: number) =>
    http.put<{ changed: boolean }>(
      `/checker/trips/${tripId}/seats`,
      { totalSeats },
      {
        showLoading: true,
        loadingText: '调整中...',
        header: checkerAuthHeader(),
      },
    ),

  // 上下线班次（在售 ⇄ 停售）
  setTripStatus: (tripId: string, status: 'ON_SALE' | 'STOPPED') =>
    http.put<{ changed: boolean }>(
      `/checker/trips/${tripId}/status`,
      { status },
      {
        showLoading: true,
        loadingText: status === 'ON_SALE' ? '恢复中...' : '停售中...',
        header: checkerAuthHeader(),
      },
    ),
};

/** 核销员 JWT 与乘客 JWT 分开存储，请求时覆盖 Authorization 头 */
function checkerAuthHeader(): Record<string, string> {
  const checkerToken = uni.getStorageSync('checkerToken') || '';
  return checkerToken ? { Authorization: `Bearer ${checkerToken}` } : {};
}
