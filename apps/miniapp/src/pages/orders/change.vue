<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { changeApi, orderApi, tripApi, type Order, type Trip } from '@/api/ticketing';

definePage({
  style: { navigationBarTitleText: '改签', backgroundColor: '#F5FAFF' },
});

const order = ref<Order | null>(null);
const date = ref<string>('');
const trips = ref<Trip[]>([]);
const loading = ref(false);
const submitting = ref(false);
const selectedTripId = ref<string>('');

const todayStr = (() => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
})();

const fmt = (cents?: number | null) => `¥${((cents ?? 0) / 100).toFixed(2)}`;

/** 可改班次：同线路、可购、同价或更低价（差价自动退回）；更高价班次不支持改签 */
const changeableTrips = computed(() =>
  trips.value.filter(
    (t) =>
      t.id !== order.value?.trip?.id &&
      t.status === 'ON_SALE' &&
      t.purchasable !== false &&
      t.priceCents <= (order.value?.trip?.priceCents ?? Infinity) &&
      t.totalSeats - t.soldSeats >= (order.value?.tickets || []).length,
  ),
);

const selectedTrip = computed(() =>
  changeableTrips.value.find((t) => t.id === selectedTripId.value),
);
const oldPriceCents = computed(() => order.value?.trip?.priceCents ?? 0);
const paidTicketCount = computed(() => (order.value?.tickets || []).length);

const priceDiffCents = computed(() => {
  if (!selectedTrip.value || !order.value) return 0;
  return (oldPriceCents.value - selectedTrip.value.priceCents) * paidTicketCount.value;
});

onLoad(async (options: any) => {
  if (!options.orderId) return;
  loading.value = true;
  try {
    const res = await orderApi.detail(options.orderId);
    order.value = res.data;
    await loadTrips(res.data.trip?.serviceDate || todayStr);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '订单加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

async function loadTrips(d: string) {
  if (!order.value?.line?.id) return;
  date.value = d;
  selectedTripId.value = '';
  try {
    const res = await tripApi.list(order.value.line.id, d);
    trips.value = res.data.trips || [];
  } catch (e) {
    trips.value = [];
  }
}

function onDateChange(e: any) {
  loadTrips(e.detail.value);
}

function pickTrip(id: string) {
  selectedTripId.value = selectedTripId.value === id ? '' : id;
}

async function submitChange() {
  if (!order.value || !selectedTripId.value || submitting.value) return;
  submitting.value = true;
  try {
    const res = await changeApi.submit(order.value.id, selectedTripId.value);
    if (res.data.priceDiffCents > 0) {
      uni.showToast({ title: '改签成功，差价将原路退回', icon: 'success' });
    } else {
      uni.showToast({ title: '改签成功', icon: 'success' });
    }
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/orders/detail?id=${order.value!.id}` });
    }, 1200);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '改签失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view v-if="!order && loading" class="empty">加载中...</view>
    <template v-else-if="order">
      <view class="summary">
        <text class="line-name">{{ order.line?.name }}</text>
        <text class="meta"
          >当前班次：{{ order.trip?.serviceDate }} {{ order.trip?.departureTime }}（{{
            fmt(order.trip?.priceCents)
          }}/张，{{ (order.tickets || []).length }} 张）</text
        >
        <text class="rule"
          >改签规则：每单限一次 · 发车前 2 小时内不可改 ·
          仅可改同价或更低票价班次（差价自动原路退回）· 改签后车票不可退</text
        >
      </view>

      <view class="date-bar">
        <picker mode="date" :value="date" :start="todayStr" @change="onDateChange">
          <view class="date-picker">
            <text>乘车日期：{{ date }}</text>
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>

      <view v-if="changeableTrips.length === 0" class="empty small">
        该日期暂无可改班次（可换一天试试）
      </view>

      <view
        v-for="trip in changeableTrips"
        :key="trip.id"
        class="trip-card"
        :class="{ selected: selectedTripId === trip.id }"
        @tap="pickTrip(trip.id)"
      >
        <view class="trip-left">
          <text class="trip-time">{{ trip.departureTime }} 发车</text>
          <text class="trip-seats"
            >余票 {{ Math.max(0, trip.totalSeats - trip.soldSeats) }} 张</text
          >
        </view>
        <view class="trip-right">
          <text class="trip-price">{{ fmt(trip.priceCents) }}</text>
          <text v-if="trip.priceCents < oldPriceCents" class="trip-diff"
            >差价退 {{ fmt((oldPriceCents - trip.priceCents) * paidTicketCount) }}</text
          >
        </view>
      </view>

      <view v-if="selectedTrip" class="confirm-bar">
        <text class="confirm-tip">
          {{
            priceDiffCents > 0 ? `改签后差价 ${fmt(priceDiffCents)} 将原路退回` : '同价改签，无差价'
          }}
        </text>
        <button class="confirm-btn" :disabled="submitting" @tap="submitChange">确认改签</button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5faff;
  padding: 24rpx;
  padding-bottom: 160rpx;
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
  font-size: 32rpx;
  font-weight: 700;
}
.meta {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.85;
}
.rule {
  display: block;
  margin-top: 14rpx;
  font-size: 20rpx;
  opacity: 0.75;
  line-height: 1.5;
}
.date-bar {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}
.date-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 28rpx;
  font-size: 28rpx;
  color: #1f2d3d;
}
.arrow {
  color: #c0ccd8;
}
.trip-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 16rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid transparent;
}
.trip-card.selected {
  border-color: #2f7ab8;
  background: #f2f9ff;
}
.trip-left {
  display: flex;
  flex-direction: column;
}
.trip-time {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.trip-seats {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #7a8b9a;
}
.trip-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.trip-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.trip-diff {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #2e9e5b;
}
.confirm-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4rpx 16rpx rgba(31, 78, 121, 0.08);
}
.confirm-tip {
  font-size: 24rpx;
  color: #2e9e5b;
  flex: 1;
  margin-right: 16rpx;
}
.confirm-btn {
  margin: 0;
  padding: 0 44rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 36rpx;
  background: #2f7ab8;
  color: #fff;
  font-size: 28rpx;
}
.empty {
  padding-top: 200rpx;
  text-align: center;
  color: #7a8b9a;
}
.empty.small {
  padding: 60rpx 0;
  font-size: 26rpx;
}
</style>
