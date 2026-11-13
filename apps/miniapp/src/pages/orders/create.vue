<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { authApi } from '@/api/auth';
import { orderApi, tripApi, type Trip } from '@/api/ticketing';
import { requestWechatPay } from '@/composables/pay';

definePage({
  style: { navigationBarTitleText: '确认订单', backgroundColor: '#F5FAFF' },
});

/** 可选票数（picker change 返回下标，需按此映射取值） */
const TICKET_COUNT_OPTIONS = [1, 2, 3, 4];

const tripId = ref('');
const lineId = ref('');
const date = ref('');
const trip = ref<Trip | null>(null);
const stations = ref<any[]>([]);
const boardingId = ref('');
const alightingId = ref('');
const contactName = ref('');
const contactPhone = ref('');
const ticketCount = ref(1);
const submitting = ref(false);
// 幂等键：本次进入页面的一次购票意图内保持不变，防止连点/网络重试重复下单
const idempotencyKey = ref('');

const boardingStations = computed(() => stations.value.filter((s) => s.type === 'BOARD'));
const alightingStations = computed(() => stations.value.filter((s) => s.type === 'ALIGHT'));
const boardingOptions = computed(() =>
  boardingStations.value.map((s) => ({ id: s.stationId, name: s.station?.name || '' })),
);
const alightingOptions = computed(() =>
  alightingStations.value.map((s) => ({ id: s.stationId, name: s.station?.name || '' })),
);
const amount = computed(() => ((trip.value?.priceCents || 0) * ticketCount.value) / 100);

// 预填联系人手机号：已注册并授权过手机号的用户自动带入
onMounted(async () => {
  const stored = uni.getStorageSync('userInfo') || {};
  if (stored.nickname) contactName.value = stored.nickname;
  if (stored.phone) {
    contactPhone.value = stored.phone;
    return;
  }
  try {
    const res = await authApi.getProfile();
    if (res.data?.nickname && !contactName.value) contactName.value = res.data.nickname;
    if (res.data?.phone) {
      contactPhone.value = res.data.phone;
      uni.setStorageSync('userInfo', res.data);
    }
  } catch {
    // 未登录或接口失败时保持手填
  }
});

onLoad(async (options: any) => {
  tripId.value = options.tripId || '';
  lineId.value = options.lineId || '';
  date.value = options.date || new Date().toISOString().slice(0, 10);
  idempotencyKey.value = `mp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  if (!tripId.value || !lineId.value) return;
  try {
    const res = await tripApi.list(lineId.value, date.value);
    const list = res.data?.trips || [];
    trip.value = list.find((item) => item.id === tripId.value) || null;
    stations.value = res.data?.stations || [];
    boardingId.value = boardingStations.value[0]?.stationId || '';
    alightingId.value = alightingStations.value[0]?.stationId || '';
  } catch (e) {
    uni.showToast({ title: '班次加载失败', icon: 'none' });
  }
});

function onBoardingChange(e: any) {
  const index = Number(e.detail.value);
  boardingId.value = boardingOptions.value[index]?.id || '';
}
function onAlightingChange(e: any) {
  const index = Number(e.detail.value);
  alightingId.value = alightingOptions.value[index]?.id || '';
}
function onCountChange(e: any) {
  // picker 单列 change 的 detail.value 是选中项下标，不是数值本身
  const index = Number(e.detail.value);
  ticketCount.value = TICKET_COUNT_OPTIONS[index] ?? ticketCount.value;
}

async function submit() {
  if (!uni.getStorageSync('token')) {
    uni.navigateTo({ url: '/pages/login?redirect=' + encodeURIComponent('/pages/orders') });
    return;
  }
  if (!contactName.value.trim()) {
    uni.showToast({ title: '请填写联系人姓名', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(contactPhone.value)) {
    uni.showToast({ title: '请填写正确的手机号', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const created = await orderApi.create(
      {
        tripId: tripId.value,
        boardingStationId: boardingId.value || undefined,
        alightingStationId: alightingId.value || undefined,
        contactName: contactName.value.trim(),
        contactPhone: contactPhone.value,
        ticketCount: ticketCount.value,
      },
      idempotencyKey.value,
    );
    const order = created.data;
    await requestWechatPay(order.id);
    uni.showToast({ title: '支付成功', icon: 'success' });
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/orders/detail?id=${order.id}` });
    }, 600);
  } catch (error: any) {
    uni.showToast({ title: error?.message || '支付未完成', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view class="card" v-if="trip">
      <text class="line-name">{{ trip.line?.name }}</text>
      <view class="info-row">
        <text class="label">乘车日期</text>
        <text class="value">{{ trip.serviceDate }} {{ trip.departureTime }}</text>
      </view>
      <view class="info-row">
        <text class="label">票价</text>
        <text class="value price">¥{{ (trip.priceCents / 100).toFixed(2) }}</text>
      </view>
    </view>

    <view class="card">
      <view class="field">
        <text class="label">上车站点</text>
        <picker :range="boardingOptions" range-key="name" @change="onBoardingChange">
          <view class="picker-value">
            {{ boardingOptions.find((s) => s.id === boardingId)?.name || '请选择' }} ▾
          </view>
        </picker>
      </view>
      <view class="field">
        <text class="label">下车站点</text>
        <picker :range="alightingOptions" range-key="name" @change="onAlightingChange">
          <view class="picker-value">
            {{ alightingOptions.find((s) => s.id === alightingId)?.name || '请选择' }} ▾
          </view>
        </picker>
      </view>
      <view class="field">
        <text class="label">联系人</text>
        <input v-model="contactName" class="input" placeholder="请输入姓名" />
      </view>
      <view class="field">
        <text class="label">手机号</text>
        <input
          v-model="contactPhone"
          class="input"
          type="number"
          :maxlength="11"
          placeholder="用于接收通知"
        />
      </view>
      <view class="field">
        <text class="label">票数</text>
        <picker :range="TICKET_COUNT_OPTIONS" @change="onCountChange">
          <view class="picker-value">{{ ticketCount }} 张 ▾</view>
        </picker>
      </view>
    </view>

    <view class="bottom-bar">
      <view class="total">
        <text>合计</text>
        <text class="amount">¥{{ amount.toFixed(2) }}</text>
      </view>
      <button class="submit-btn" :loading="submitting" @tap="submit">微信支付</button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5faff;
  padding: 24rpx 24rpx 160rpx;
  box-sizing: border-box;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.line-name {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 20rpx;
}
.info-row,
.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f4f8;
}
.info-row:last-child,
.field:last-child {
  border-bottom: none;
}
.label {
  font-size: 26rpx;
  color: #7a8b9a;
}
.value {
  font-size: 28rpx;
  color: #1f2d3d;
}
.price {
  color: #e85d3f;
  font-weight: 600;
}
.picker-value {
  font-size: 28rpx;
  color: #1f2d3d;
}
.input {
  text-align: right;
  font-size: 28rpx;
  color: #1f2d3d;
}
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -8rpx 24rpx rgba(31, 78, 121, 0.08);
}
.total {
  font-size: 26rpx;
  color: #7a8b9a;
}
.amount {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #e85d3f;
}
.submit-btn {
  margin: 0;
  width: 240rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  background: #1f4e79;
  color: #fff;
  font-size: 28rpx;
}
</style>
