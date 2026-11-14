<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { checkerApi } from '@/api/ticketing';
import type { CheckerTrip } from '@/api/ticketing';

definePage({
  style: { navigationBarTitleText: '班次管理', backgroundColor: '#F5FAFF' },
});

const TRIP_STATUS_LABELS: Record<string, string> = {
  ON_SALE: '在售',
  STOPPED: '停售',
  DEPARTED: '已发车',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const date = ref(todayStr());
const trips = ref<CheckerTrip[]>([]);
const loading = ref(false);
const loaded = ref(false);

// 调整余票弹层
const adjustTrip = ref<CheckerTrip | null>(null);
const adjustInput = ref('');

const dateChips = computed(() => [
  { label: '今日', value: todayStr() },
  { label: '明日', value: offsetDate(1) },
]);

function todayStr(): string {
  return formatDate(new Date());
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function formatDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function fmtPrice(cents: number): string {
  const yuan = cents / 100;
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2);
}

async function load() {
  loading.value = true;
  try {
    const res = await checkerApi.trips(date.value);
    trips.value = res.data || [];
    loaded.value = true;
  } catch (e: any) {
    uni.showToast({ title: e?.message || '班次加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function onPickChip(value: string) {
  if (date.value === value) return;
  date.value = value;
  load();
}

function onDateChange(e: any) {
  const value = String(e?.detail?.value || '');
  if (!value || date.value === value) return;
  date.value = value;
  load();
}

/** 核销员仅可操作在售/停售班次；已发车/已完成/已取消只读展示 */
function isEditable(trip: CheckerTrip): boolean {
  return trip.status === 'ON_SALE' || trip.status === 'STOPPED';
}

function toggleStatus(trip: CheckerTrip) {
  const toOnSale = trip.status === 'STOPPED';
  uni.showModal({
    title: toOnSale ? '恢复销售' : '停售班次',
    content: toOnSale
      ? `确认恢复「${trip.departureTime} ${trip.lineName}」售票？恢复后乘客端立即可见可购。`
      : `停售后乘客端立即不可见、不可购票。确认停售「${trip.departureTime} ${trip.lineName}」？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await checkerApi.setTripStatus(trip.id, toOnSale ? 'ON_SALE' : 'STOPPED');
        uni.showToast({ title: toOnSale ? '已恢复销售' : '已停售', icon: 'success' });
        load();
      } catch (e: any) {
        uni.showToast({ title: e?.message || '操作失败', icon: 'none' });
      }
    },
  });
}

function openAdjust(trip: CheckerTrip) {
  adjustTrip.value = trip;
  adjustInput.value = String(trip.totalSeats);
}

function closeAdjust() {
  adjustTrip.value = null;
  adjustInput.value = '';
}

async function confirmAdjust() {
  const trip = adjustTrip.value;
  if (!trip) return;
  const totalSeats = Number(adjustInput.value);
  if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > 999) {
    uni.showToast({ title: '请输入 1-999 的整数', icon: 'none' });
    return;
  }
  if (totalSeats < trip.soldSeats) {
    uni.showToast({ title: `不能低于已售座位数（${trip.soldSeats}）`, icon: 'none' });
    return;
  }
  try {
    await checkerApi.adjustSeats(trip.id, totalSeats);
    uni.showToast({ title: '余票已调整', icon: 'success' });
    closeAdjust();
    load();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '调整失败', icon: 'none' });
  }
}

// 现场处置要求看到最新余票：每次回到本页都刷新（首次展示也由 onShow 触发）
onShow(() => {
  load();
});
</script>

<template>
  <view class="page">
    <view class="date-bar">
      <view
        v-for="chip in dateChips"
        :key="chip.value"
        class="chip"
        :class="{ active: date === chip.value }"
        @tap="onPickChip(chip.value)"
      >
        {{ chip.label }}
      </view>
      <picker mode="date" :value="date" class="date-picker" @change="onDateChange">
        <view
          class="chip picker-chip"
          :class="{ active: date !== todayStr() && date !== offsetDate(1) }"
        >
          {{ date }}
        </view>
      </picker>
    </view>

    <view v-if="trips.length" class="trip-list">
      <view v-for="trip in trips" :key="trip.id" class="trip-card">
        <view class="trip-head">
          <text class="dep-time">{{ trip.departureTime }}</text>
          <view class="trip-title">
            <text class="line-name">{{ trip.lineName }}</text>
            <text class="price">¥{{ fmtPrice(trip.priceCents) }}</text>
          </view>
          <text class="status-badge" :class="trip.status.toLowerCase()">
            {{ TRIP_STATUS_LABELS[trip.status] || trip.status }}
          </text>
        </view>
        <view class="stats-row">
          <text class="stat"
            >余票 <text class="num">{{ trip.remainingSeats }}</text></text
          >
          <text class="stat"
            >已售 <text class="num">{{ trip.soldSeats }}</text></text
          >
          <text class="stat"
            >已核销 <text class="num">{{ trip.checkedInCount }}</text></text
          >
          <text v-if="trip.status === 'ON_SALE' && !trip.purchasable" class="off-sale-hint">
            已过停售时间
          </text>
        </view>
        <view v-if="isEditable(trip)" class="actions-row">
          <button
            class="action-btn"
            :class="{ danger: trip.status === 'ON_SALE', primary: trip.status === 'STOPPED' }"
            @tap="toggleStatus(trip)"
          >
            {{ trip.status === 'STOPPED' ? '恢复销售' : '停售' }}
          </button>
          <button class="action-btn" @tap="openAdjust(trip)">调余票</button>
        </view>
        <view v-else class="readonly-hint"
          >该班次不可操作（{{ TRIP_STATUS_LABELS[trip.status] || trip.status }}）</view
        >
      </view>
    </view>

    <view v-else-if="loaded && !loading" class="empty">
      <text>当日暂无班次</text>
    </view>
    <view v-if="loading && !trips.length" class="empty">
      <text>加载中...</text>
    </view>

    <view v-if="adjustTrip" class="mask" @tap="closeAdjust">
      <view class="popup" @tap.stop>
        <text class="popup-title">调整总票数</text>
        <text class="popup-sub">{{ adjustTrip.departureTime }} {{ adjustTrip.lineName }}</text>
        <view class="popup-stats">
          <text>总票数 {{ adjustTrip.totalSeats }}</text>
          <text>已售 {{ adjustTrip.soldSeats }}</text>
          <text>余票 {{ adjustTrip.remainingSeats }}</text>
        </view>
        <input
          v-model="adjustInput"
          class="popup-input"
          type="number"
          :maxlength="3"
          placeholder="新的总票数（不低于已售）"
        />
        <view class="popup-actions">
          <button class="popup-btn cancel" @tap="closeAdjust">取消</button>
          <button class="popup-btn ok" @tap="confirmAdjust">确认调整</button>
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
.date-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  align-items: center;
}
.chip {
  padding: 12rpx 28rpx;
  border-radius: 30rpx;
  background: #fff;
  color: #1f2d3d;
  font-size: 26rpx;
  border: 1rpx solid #dbe6f0;
}
.chip.active {
  background: #1f4e79;
  color: #fff;
  border-color: #1f4e79;
}
.picker-chip {
  color: #556b7e;
}
.picker-chip.active {
  color: #fff;
}
.trip-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.trip-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.dep-time {
  font-size: 40rpx;
  font-weight: 700;
  color: #1f2d3d;
}
.trip-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.line-name {
  font-size: 28rpx;
  color: #1f2d3d;
  font-weight: 600;
}
.price {
  font-size: 24rpx;
  color: #7a8b9a;
}
.status-badge {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  background: #e8f1fa;
  color: #1f4e79;
}
.status-badge.stopped {
  background: #fdf1ec;
  color: #e85d3f;
}
.status-badge.departed,
.status-badge.completed,
.status-badge.cancelled {
  background: #f0f4f8;
  color: #7a8b9a;
}
.stats-row {
  display: flex;
  gap: 32rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f4f8;
  font-size: 26rpx;
  color: #556b7e;
  align-items: center;
}
.stat .num {
  font-weight: 700;
  color: #1f2d3d;
}
.off-sale-hint {
  margin-left: auto;
  font-size: 22rpx;
  color: #e85d3f;
}
.actions-row {
  display: flex;
  gap: 16rpx;
  margin-top: 22rpx;
}
.action-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 12rpx;
  background: #e8f1fa;
  color: #1f4e79;
  font-size: 26rpx;
  margin: 0;
  padding: 0;
}
.action-btn.danger {
  background: #fdf1ec;
  color: #e85d3f;
}
.action-btn.primary {
  background: #1f4e79;
  color: #fff;
}
.readonly-hint {
  margin-top: 18rpx;
  font-size: 22rpx;
  color: #a9b8c6;
}
.empty {
  padding: 120rpx 0;
  text-align: center;
  color: #a9b8c6;
  font-size: 26rpx;
}
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 35, 55, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.popup {
  width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx 36rpx;
}
.popup-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2d3d;
}
.popup-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7a8b9a;
}
.popup-stats {
  display: flex;
  gap: 28rpx;
  margin-top: 24rpx;
  padding: 18rpx 22rpx;
  background: #f5faff;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #556b7e;
}
.popup-input {
  margin-top: 24rpx;
  height: 84rpx;
  border: 1rpx solid #dbe6f0;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
}
.popup-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;
}
.popup-btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 38rpx;
  font-size: 28rpx;
  margin: 0;
  padding: 0;
}
.popup-btn.cancel {
  background: #f0f4f8;
  color: #556b7e;
}
.popup-btn.ok {
  background: #1f4e79;
  color: #fff;
}
</style>
