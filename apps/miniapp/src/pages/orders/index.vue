<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { orderApi, type Order } from '@/api/ticketing';
import { requestWechatPay } from '@/composables/pay';

definePage({
  style: { navigationBarTitleText: '我的订单', backgroundColor: '#F5FAFF' },
});

/** 订单状态 Tab：全部 / 待支付 / 待出行 / 已完成 */
const TABS = [
  { key: 'ALL', label: '全部' },
  { key: 'PENDING_PAYMENT', label: '待支付' },
  { key: 'PAID', label: '待出行' },
  { key: 'COMPLETED', label: '已完成' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID: '待出行',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
};

const activeTab = ref<string>('ALL');
const orders = ref<Order[]>([]);
const loading = ref(true);
const paying = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await orderApi.list();
    orders.value = res.data || [];
  } catch (e) {
    uni.showToast({ title: '订单加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

onShow(async () => {
  if (!uni.getStorageSync('token')) {
    uni.navigateTo({ url: '/pages/login?redirect=' + encodeURIComponent('/pages/orders') });
    return;
  }
  await load();
});

const filteredOrders = computed(() => {
  if (activeTab.value === 'ALL') return orders.value;
  return orders.value.filter((o) => o.orderStatus === activeTab.value);
});

function statusLabel(order: Order) {
  return STATUS_LABELS[order.orderStatus] || order.orderStatus;
}

function isPendingPayment(order: Order) {
  return order.orderStatus === 'PENDING_PAYMENT';
}

function switchTab(tab: string) {
  activeTab.value = tab;
}

async function payOrder(order: Order) {
  if (paying.value) return;
  paying.value = true;
  try {
    await requestWechatPay(order.id);
    uni.showToast({ title: '支付成功', icon: 'success' });
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/orders/detail?id=${order.id}` });
    }, 600);
  } catch (error: any) {
    uni.showToast({ title: error?.message || '支付未完成', icon: 'none' });
    await load();
  } finally {
    paying.value = false;
  }
}

function goBuy() {
  uni.reLaunch({ url: '/pages/index' });
}

function openOrder(order: Order) {
  uni.navigateTo({ url: `/pages/orders/detail?id=${order.id}` });
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
        @tap="switchTab(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="filteredOrders.length === 0" class="empty">
      还没有订单
      <text class="link" @tap="goBuy">去购票</text>
    </view>
    <view v-else class="order-list">
      <view
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        @tap="openOrder(order)"
      >
        <view class="order-head">
          <text class="order-no">{{ order.orderNo }}</text>
          <text class="status" :class="{ pending: isPendingPayment(order) }">{{
            statusLabel(order)
          }}</text>
        </view>
        <text class="line-name">{{ order.line?.name }}</text>
        <view class="order-foot">
          <text class="date">{{ order.trip?.serviceDate }} {{ order.trip?.departureTime }}</text>
          <view class="foot-right">
            <text class="amount">¥{{ (order.totalAmountCents / 100).toFixed(2) }}</text>
            <button
              v-if="isPendingPayment(order)"
              class="pay-btn"
              :disabled="paying"
              @tap.stop="payOrder(order)"
            >
              去支付
            </button>
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
  background: #1f4e79;
  color: #fff;
  font-weight: 600;
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.order-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.order-head,
.order-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-no {
  font-size: 24rpx;
  color: #7a8b9a;
}
.status {
  font-size: 24rpx;
  color: #1f4e79;
}
.status.pending {
  color: #e85d3f;
}
.line-name {
  display: block;
  margin: 18rpx 0;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.date {
  font-size: 24rpx;
  color: #7a8b9a;
}
.foot-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.amount {
  font-size: 30rpx;
  font-weight: 700;
  color: #e85d3f;
}
.pay-btn {
  margin: 0;
  padding: 0 24rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  background: #e85d3f;
  color: #fff;
  font-size: 24rpx;
}
.empty {
  padding-top: 200rpx;
  text-align: center;
  color: #7a8b9a;
}
.link {
  display: block;
  margin-top: 20rpx;
  color: #1f4e79;
}
</style>
