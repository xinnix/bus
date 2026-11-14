<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { orderApi } from '@/api/ticketing';
import type { Order, Ticket } from '@/api/ticketing';
import { requestDepartureSubscribe } from '@/composables/pay';

definePage({
  style: { navigationBarTitleText: '我的车票', backgroundColor: '#F5FAFF' },
});

/** 车票状态 Tab：待出行（已购）/ 已完成 */
const TABS = [
  { key: 'PAID', label: '待出行' },
  { key: 'COMPLETED', label: '已完成' },
] as const;

const TICKET_STATUS_LABELS: Record<string, string> = {
  UNUSED: '待使用',
  CHECKED_IN: '已核销',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  CANCELLED: '已取消',
};

const activeTab = ref<string>('PAID');
const orders = ref<Order[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const res = await orderApi.list();
    orders.value = res.data || [];
  } catch {
    uni.showToast({ title: '车票加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(async () => {
  if (!uni.getStorageSync('token')) {
    uni.navigateTo({ url: `/pages/login?redirect=${encodeURIComponent('/pages/tickets/index')}` });
    return;
  }
  await load();
});

/** 已购车票：待出行 tab 含退款中间态（票仍有效）；已完成仅按订单完成态归类（P0 产品语义） */
const filteredOrders = computed(() =>
  orders.value.filter((o) =>
    activeTab.value === 'PAID'
      ? ['PAID', 'REFUNDING', 'PARTIALLY_REFUNDED'].includes(o.orderStatus)
      : o.orderStatus === activeTab.value,
  ),
);

async function subscribeDeparture() {
  const result = await requestDepartureSubscribe();
  if (result === 'granted') uni.showToast({ title: '已开启发车提醒', icon: 'success' });
  else if (result === 'rejected') uni.showToast({ title: '未开启提醒', icon: 'none' });
  else uni.showToast({ title: '发车提醒暂未开放', icon: 'none' });
}

function ticketLabel(ticket: Ticket) {
  return TICKET_STATUS_LABELS[ticket.status] || ticket.status;
}

function openOrder(order: Order) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${order.id}` });
}

function goBuy() {
  uni.switchTab({ url: '/pages/index' });
}
</script>

<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <view class="remind-bar" @tap="subscribeDeparture">
      <text class="remind-icon">🔔</text>
      <text class="remind-text">开启发车提醒，出票/发车前自动通知</text>
      <text class="remind-arrow">›</text>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="filteredOrders.length === 0" class="empty">
      {{ activeTab === 'PAID' ? '还没有待出行的车票' : '暂无已完成行程' }}
      <text v-if="activeTab === 'PAID'" class="link" @tap="goBuy">去购票</text>
    </view>
    <view v-else class="ticket-list">
      <view
        v-for="order in filteredOrders"
        :key="order.id"
        class="ticket-card"
        @tap="openOrder(order)"
      >
        <view class="card-head">
          <text class="line-name">{{ order.line?.name }}</text>
          <text class="amount">¥{{ (order.totalAmountCents / 100).toFixed(2) }}</text>
        </view>
        <view class="card-meta">
          <text class="date">{{ order.trip?.serviceDate }} {{ order.trip?.departureTime }}</text>
          <text class="count">{{ order.ticketCount }} 张票</text>
        </view>
        <view class="ticket-rows">
          <view v-for="ticket in order.tickets" :key="ticket.id" class="ticket-row">
            <text class="passenger">{{ ticket.passengerName }}</text>
            <view class="row-right">
              <text class="ticket-status" :class="[`st-${ticket.status}`]">
                {{ ticketLabel(ticket) }}
              </text>
              <text class="check-code">核销码 {{ ticket.checkCode }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5faff;
  padding: 24rpx;
}
.tabs {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  padding: 8rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #7a8b9a;
  border-radius: 16rpx;
}
.tab-item.active {
  background: #00aeef;
  color: #fff;
  font-weight: 600;
}
.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.ticket-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.card-head,
.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.line-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.amount {
  font-size: 30rpx;
  font-weight: 700;
  color: #e85d3f;
}
.card-meta {
  margin-top: 12rpx;
}
.date,
.count {
  font-size: 24rpx;
  color: #7a8b9a;
}
.ticket-rows {
  margin-top: 18rpx;
  border-top: 2rpx dashed rgba(122, 139, 154, 0.35);
  padding-top: 6rpx;
}
.ticket-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}
.passenger {
  font-size: 28rpx;
  color: #1f2d3d;
}
.row-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ticket-status {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}
.st-UNUSED {
  color: #00aeef;
  background: rgba(0, 174, 239, 0.1);
}
.st-CHECKED_IN {
  color: #1f4e79;
  background: rgba(31, 78, 121, 0.1);
}
.st-CANCELLED {
  color: #7a8b9a;
  background: rgba(122, 139, 154, 0.12);
}
.st-REFUNDING {
  color: #b45309;
  background: rgba(180, 83, 9, 0.12);
}
.st-REFUNDED {
  color: #b91c1c;
  background: rgba(185, 28, 28, 0.12);
}
.remind-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 26rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.remind-icon {
  margin-right: 12rpx;
  font-size: 26rpx;
}
.remind-text {
  flex: 1;
  font-size: 24rpx;
  color: #1f2d3d;
}
.remind-arrow {
  color: #c0ccd8;
}
.check-code {
  font-size: 24rpx;
  color: #7a8b9a;
}
.empty {
  padding-top: 200rpx;
  text-align: center;
  color: #7a8b9a;
}
.link {
  display: block;
  margin-top: 20rpx;
  color: #00aeef;
}
</style>
