<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { lineApi, tripApi, type Line, type Trip } from '@/api/ticketing';

definePage({
  style: { navigationBarTitleText: '选择班次', backgroundColor: '#F5FAFF' },
});

const lineId = ref('');
const date = ref('');
const line = ref<Line | null>(null);
const trips = ref<Trip[]>([]);
const loading = ref(true);

onLoad(async (options: any) => {
  lineId.value = options.lineId || '';
  date.value = options.date || new Date().toISOString().slice(0, 10);
  if (!lineId.value) {
    uni.showToast({ title: '缺少线路参数', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const [lineRes, tripRes] = await Promise.all([
      lineApi.list(),
      tripApi.list(lineId.value, date.value),
    ]);
    line.value = (lineRes.data || []).find((item) => item.id === lineId.value) || null;
    trips.value = tripRes.data?.trips || [];
  } catch (e) {
    uni.showToast({ title: '班次加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

function selectTrip(trip: Trip) {
  // 停售班次（发车后 30 分钟）禁止选择，后端下单同样校验
  if (trip.purchasable === false) {
    uni.showToast({ title: '该班次已停止售票', icon: 'none' });
    return;
  }
  uni.navigateTo({
    url: `/pages/orders/create?tripId=${trip.id}&lineId=${lineId.value}&date=${date.value}`,
  });
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="line-name">{{ line?.name || '班次列表' }}</text>
      <text class="line-sub">{{ date }} · {{ trips.length }} 个班次</text>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="trips.length === 0" class="empty">当天暂无班次</view>
    <view v-else class="trip-list">
      <view
        v-for="trip in trips"
        :key="trip.id"
        class="trip-card"
        :class="{ disabled: trip.purchasable === false }"
        @tap="selectTrip(trip)"
      >
        <view class="trip-time">
          <text class="time">{{ trip.departureTime }}</text>
          <text class="price">¥{{ (trip.priceCents / 100).toFixed(2) }}</text>
        </view>
        <view class="trip-meta">
          <text class="remaining">余票 {{ trip.totalSeats - trip.soldSeats }} 张</text>
          <text class="status" :class="{ off: trip.purchasable === false }">
            {{ trip.purchasable === false ? '已停售' : '售票中' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5faff;
}
.header {
  padding: 36rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8eef5;
}
.line-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2d3d;
}
.line-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7a8b9a;
}
.trip-list {
  padding: 24rpx;
}
.trip-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.trip-card.disabled {
  opacity: 0.55;
}
.trip-time {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.time {
  font-size: 42rpx;
  font-weight: 700;
  color: #1f4e79;
}
.price {
  font-size: 30rpx;
  font-weight: 600;
  color: #e85d3f;
}
.trip-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
}
.remaining,
.status {
  font-size: 24rpx;
  color: #7a8b9a;
}
.status.off {
  color: #e85d3f;
  font-weight: 600;
}
.empty {
  padding: 100rpx;
  text-align: center;
  color: #7a8b9a;
}
</style>
