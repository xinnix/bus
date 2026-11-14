<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { orderApi, refundApi, type Order, type RefundQuote, type Ticket } from '@/api/ticketing';
import { requestWechatPay } from '@/composables/pay';
import { makeQrMatrix, type QrMatrix } from '@/utils/qr';

definePage({
  style: { navigationBarTitleText: '电子票', backgroundColor: '#F5FAFF' },
});

/** 电子票视图模型：附加二维码矩阵（1=黑格），生成失败时降级为仅展示核销码 */
interface TicketView extends Ticket {
  qr?: QrMatrix;
  qrFailed?: boolean;
  /** 微信小程序码（后端出图 dataURL）：成功后替换本地矩阵，核票员微信扫一扫可直达核验 */
  wxacode?: string;
}

const TICKET_STATUS: Record<string, string> = {
  UNUSED: '未使用',
  CHECKED_IN: '已核销',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  CANCELLED: '已取消',
};

const ORDER_STATUS: Record<string, string> = {
  PENDING_PAYMENT: '订单待支付',
  PAID: '',
  COMPLETED: '行程已完成',
  REFUNDING: '退款处理中，到账以退款记录为准',
  PARTIALLY_REFUNDED: '订单部分退款',
  REFUNDED: '订单已全额退款',
  CLOSED: '订单已关闭',
};

const order = ref<Order | null>(null);
const tickets = ref<TicketView[]>([]);
const loading = ref(true);
const paying = ref(false);

// P0.5 退票弹层状态
const showRefund = ref(false);
const selectedTicketIds = ref<string[]>([]);
const quote = ref<RefundQuote | null>(null);
const refunding = ref(false);

const fmt = (cents?: number | null) => `¥${((cents ?? 0) / 100).toFixed(2)}`;

const refundableTickets = computed(() =>
  (order.value?.tickets || []).filter((t) => t.status === 'UNUSED' && !t.changedAt),
);
const canRefund = computed(
  () =>
    ['PAID', 'REFUNDING', 'PARTIALLY_REFUNDED'].includes(order.value?.orderStatus || '') &&
    order.value?.payment?.status === 'PAID' &&
    refundableTickets.value.length > 0,
);
/** 整单改签：全部车票未使用且订单已支付（每单限一次，后端校验改签记录） */
const canChange = computed(
  () =>
    order.value?.orderStatus === 'PAID' &&
    (order.value?.tickets || []).length > 0 &&
    (order.value?.tickets || []).every((t) => t.status === 'UNUSED'),
);

async function loadOrder(id: string) {
  const res = await orderApi.detail(id);
  order.value = res.data;
  // 二维码内容优先 HMAC qrToken（防伪、按时失效），接口未下发时回退核销码
  tickets.value = (res.data.tickets || []).map((ticket) => {
    try {
      return { ...ticket, qr: makeQrMatrix(ticket.qrToken || ticket.checkCode) };
    } catch {
      return { ...ticket, qrFailed: true };
    }
  });
  // 小程序码异步拉取：成功则替换本地矩阵；失败（微信配置缺失/接口异常）静默保留矩阵兜底
  tickets.value.forEach((ticket) => {
    orderApi
      .wxacode(res.data.id, ticket.id)
      .then((result) => {
        const target = tickets.value.find((item) => item.id === ticket.id);
        if (target) target.wxacode = result.data.image;
      })
      .catch(() => {});
  });
}

onLoad(async (options: any) => {
  if (!options.id) return;
  try {
    await loadOrder(options.id);
  } catch (e) {
    uni.showToast({ title: '订单加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

async function payOrder() {
  if (!order.value || paying.value) return;
  paying.value = true;
  try {
    await requestWechatPay(order.value.id);
    uni.showToast({ title: '支付成功', icon: 'success' });
    await loadOrder(order.value.id);
  } catch (error: any) {
    uni.showToast({ title: error?.message || '支付未完成', icon: 'none' });
  } finally {
    paying.value = false;
  }
}

// ====================
// P0.5 退票
// ====================

function openRefund() {
  selectedTicketIds.value = [];
  quote.value = null;
  showRefund.value = true;
}

async function onSelectionChange() {
  quote.value = null;
  if (!order.value || selectedTicketIds.value.length === 0) return;
  try {
    const res = await refundApi.quote(order.value.id, selectedTicketIds.value);
    quote.value = res.data;
  } catch (e: any) {
    uni.showToast({ title: e?.message || '获取退款金额失败', icon: 'none' });
    selectedTicketIds.value = [];
  }
}

function toggleTicket(id: string) {
  const idx = selectedTicketIds.value.indexOf(id);
  if (idx >= 0) selectedTicketIds.value.splice(idx, 1);
  else selectedTicketIds.value.push(id);
  onSelectionChange();
}

async function submitRefund() {
  if (!order.value || selectedTicketIds.value.length === 0 || !quote.value) return;
  refunding.value = true;
  try {
    await refundApi.request(order.value.id, selectedTicketIds.value);
    uni.showToast({ title: '退款已提交', icon: 'success' });
    showRefund.value = false;
    await loadOrder(order.value.id);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '退款提交失败', icon: 'none' });
  } finally {
    refunding.value = false;
  }
}

function goChange() {
  if (!order.value) return;
  uni.navigateTo({ url: `/pages/orders/change?orderId=${order.value.id}` });
}
</script>

<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!order" class="empty">订单不存在</view>
    <template v-else>
      <view class="summary">
        <text class="line-name">{{ order.line?.name }}</text>
        <text class="meta">{{ order.trip?.serviceDate }} {{ order.trip?.departureTime }}</text>
        <text class="meta">{{ order.contactName }} · {{ order.contactPhone }}</text>
      </view>

      <view v-if="order.orderStatus === 'PENDING_PAYMENT'" class="banner pending">
        <text>订单待支付，支付完成后出票</text>
        <button class="pay-btn" :disabled="paying" @tap="payOrder">去支付</button>
      </view>
      <view v-else-if="ORDER_STATUS[order.orderStatus]" class="banner status-banner">
        <text>{{ ORDER_STATUS[order.orderStatus] }}</text>
      </view>

      <!-- P0.5 退票 / 改签入口 -->
      <view v-if="canRefund || canChange" class="banner actions">
        <view class="action-row">
          <button v-if="canRefund" class="action-btn refund" @tap="openRefund">申请退票</button>
          <button v-if="canChange" class="action-btn change" @tap="goChange">改签</button>
        </view>
        <text class="rule-tip"
          >退票：发车前24h以上免手续费 / 2–24h收5% / 2h内停退 ·
          改签：每单限一次，仅可改同价或低价班次</text
        >
      </view>

      <view v-for="ticket in tickets" :key="ticket.id" class="ticket-card">
        <view class="ticket-head">
          <text class="passenger">{{ ticket.passengerName }}</text>
          <view class="ticket-tags">
            <text v-if="ticket.changedAt" class="tag changed">改签</text>
            <text v-if="ticket.status !== 'UNUSED'" class="tag" :class="'st-' + ticket.status">{{
              TICKET_STATUS[ticket.status] || ticket.status
            }}</text>
          </view>
        </view>
        <!-- 二维码仅对未使用票展示；已核销/退款中/已退款票不给出入码 -->
        <view v-if="ticket.status === 'UNUSED' && ticket.wxacode" class="qr-area">
          <view class="qr-wrap">
            <image class="wxacode" :src="ticket.wxacode" mode="aspectFit" />
          </view>
        </view>
        <view v-else-if="ticket.status === 'UNUSED' && ticket.qr" class="qr-area">
          <view class="qr-wrap">
            <view v-for="(row, rowIndex) in ticket.qr.rows" :key="rowIndex" class="qr-row">
              <view
                v-for="(dark, colIndex) in row"
                :key="colIndex"
                class="qr-cell"
                :class="{ black: dark === 1 }"
                :style="'width:' + ticket.qr!.cellRpx + 'rpx;height:' + ticket.qr!.cellRpx + 'rpx'"
              />
            </view>
          </view>
        </view>
        <text v-else-if="ticket.status === 'UNUSED' && ticket.qrFailed" class="qr-fallback"
          >二维码生成失败，请出示下方核销码</text
        >
        <text class="check-code">核销码：{{ ticket.checkCode }}</text>
        <text class="tip">上车时请向检票员出示二维码</text>
      </view>

      <!-- P0.5 退票弹层 -->
      <view v-if="showRefund" class="modal-mask" @tap="showRefund = false">
        <view class="modal" @tap.stop>
          <text class="modal-title">选择要退的车票</text>
          <view
            v-for="t in refundableTickets"
            :key="t.id"
            class="refund-row"
            @tap="toggleTicket(t.id)"
          >
            <view class="checkbox" :class="{ checked: selectedTicketIds.includes(t.id) }">✓</view>
            <text class="refund-name">{{ t.passengerName }}（{{ t.ticketNo }}）</text>
            <text class="refund-price">{{ fmt(t.priceCents) }}</text>
          </view>
          <view v-if="quote" class="quote-box">
            <text class="quote-rule">{{ quote.rule }}</text>
            <text class="quote-amount"
              >手续费 {{ fmt(quote.feeCents) }} · 原路退回 {{ fmt(quote.refundCents) }}</text
            >
          </view>
          <text v-else class="quote-hint">点选车票后自动计算手续费与到账金额</text>
          <button class="modal-btn" :disabled="!quote || refunding" @tap="submitRefund">
            确认退票
          </button>
          <button class="modal-cancel" @tap="showRefund = false">取消</button>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5faff;
  padding: 24rpx;
}
.summary {
  background: linear-gradient(135deg, #1f4e79, #2f7ab8);
  color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}
.line-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
}
.meta {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.85;
}
.ticket-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.ticket-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 24rpx;
  color: #7a8b9a;
}
.passenger {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.ticket-tags {
  display: flex;
  gap: 8rpx;
}
.tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.tag.changed {
  background: #f3e8ff;
  color: #7c3aed;
}
.tag.st-REFUNDING {
  background: #fef3c7;
  color: #b45309;
}
.tag.st-REFUNDED {
  background: #fee2e2;
  color: #b91c1c;
}
.tag.st-CHECKED_IN {
  background: #dcfce7;
  color: #15803d;
}
.tag.st-CANCELLED {
  background: #f1f5f9;
  color: #64748b;
}
.qr-area {
  display: flex;
  justify-content: center;
  margin: 24rpx 0;
}
.qr-wrap {
  display: inline-block;
  background: #fff;
  /* 白边（quiet zone）：扫码识别需要足够留白 */
  padding: 24rpx;
  border: 1rpx solid #eef3f8;
  border-radius: 8rpx;
}
.qr-row {
  display: flex;
}
.qr-cell {
  background: #fff;
}
.qr-cell.black {
  background: #111;
}
.wxacode {
  width: 432rpx;
  height: 432rpx;
  display: block;
}
.qr-fallback {
  display: block;
  margin: 24rpx 0;
  font-size: 24rpx;
  color: #e85d3f;
}
.check-code {
  display: block;
  font-size: 28rpx;
  color: #1f2d3d;
  font-weight: 600;
}
.tip {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #7a8b9a;
}
.empty {
  padding-top: 200rpx;
  text-align: center;
  color: #7a8b9a;
}
.banner {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 20rpx;
  font-size: 26rpx;
}
.banner.pending {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  color: #e85d3f;
  box-shadow: 0 8rpx 24rpx rgba(232, 93, 63, 0.12);
}
.banner.status-banner {
  color: #7a8b9a;
}
.actions {
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.action-row {
  display: flex;
  gap: 16rpx;
}
.action-btn {
  margin: 0;
  padding: 0 34rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
}
.action-btn.refund {
  background: #fff4f0;
  color: #e85d3f;
}
.action-btn.change {
  background: #e8f4fd;
  color: #1f7ac2;
}
.rule-tip {
  display: block;
  margin-top: 14rpx;
  font-size: 20rpx;
  color: #9aa8b5;
  line-height: 1.5;
}
.pay-btn {
  margin: 0;
  padding: 0 28rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  background: #e85d3f;
  color: #fff;
  font-size: 26rpx;
}
/* 退票弹层 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 35, 55, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}
.modal {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom));
}
.modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 20rpx;
}
.refund-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f4f8;
}
.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #c9d6e2;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: transparent;
}
.checkbox.checked {
  background: #2f7ab8;
  border-color: #2f7ab8;
  color: #fff;
}
.refund-name {
  flex: 1;
  font-size: 26rpx;
  color: #1f2d3d;
}
.refund-price {
  font-size: 26rpx;
  color: #7a8b9a;
}
.quote-box {
  background: #f5faff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-top: 20rpx;
}
.quote-rule {
  display: block;
  font-size: 22rpx;
  color: #7a8b9a;
}
.quote-amount {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.quote-hint {
  display: block;
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #9aa8b5;
}
.modal-btn {
  margin-top: 28rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  background: #e85d3f;
  color: #fff;
  font-size: 28rpx;
}
.modal-btn[disabled] {
  background: #f0d9d2;
  color: #fff;
}
.modal-cancel {
  margin-top: 16rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 28rpx;
}
</style>
