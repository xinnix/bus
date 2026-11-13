<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { lineApi, type Line } from '@/api/ticketing';
import { useTopInset } from '@/composables/topInset';
import { getCheckerIdentity, refreshCheckerIdentity } from '@/utils/checkerIdentity';

definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#F5FAFF',
    navigationBarTitleText: '桥水出行',
  },
});

const { topInset } = useTopInset();
// topInset 是 ComputedRef，模板字符串里 .value 拼接
// hero 上移填满状态栏/胶囊区，品牌色一直延伸到屏幕顶端
const heroStyle = computed(() => `padding-top: ${topInset.value + 24}px;`);
const lines = ref<Line[]>([]);
/** 本地日期（toISOString 在东八区深夜会退回前一天，这里按本地时区格式化） */
function fmtLocalDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
const today = fmtLocalDate(new Date());
const date = ref(today);
const loading = ref(false);
// 核销员身份：storage 先行渲染，onShow 静默刷新（覆盖登录早于绑定/本功能上线的场景）
const isChecker = ref(!!getCheckerIdentity());

onShow(async () => {
  loading.value = true;
  if (uni.getStorageSync('token')) {
    refreshCheckerIdentity().then((checker) => {
      isChecker.value = !!checker;
    });
  } else {
    isChecker.value = false;
  }
  try {
    const res = await lineApi.list();
    lines.value = res.data || [];
  } catch (e) {
    uni.showToast({ title: '线路加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

function onDateChange(e: any) {
  date.value = e.detail.value;
}

function openChecker() {
  uni.navigateTo({ url: '/pages/checker/index' });
}

function openLine(line: Line) {
  uni.navigateTo({
    url: `/pages/trips/list?lineId=${line.id}&date=${date.value}`,
  });
}
</script>

<template>
  <view class="page">
    <view class="hero" :style="heroStyle">
      <text class="brand">桥水出行</text>
      <text class="slogan">安全 · 舒适 · 直达</text>
      <view class="date-row">
        <text class="date-label">乘车日期</text>
        <picker mode="date" :value="date" :start="today" @change="onDateChange">
          <view class="date-value">{{ date }} ▾</view>
        </picker>
      </view>
    </view>

    <!-- 核销员身份入口：仅绑定了核销员身份的用户可见 -->
    <view v-if="isChecker" class="checker-entry" @tap="openChecker">
      <text class="checker-entry-icon">🎫</text>
      <view class="checker-entry-main">
        <text class="checker-entry-title">验票工作台</text>
        <text class="checker-entry-sub">扫码 / 核销码核销乘客车票</text>
      </view>
      <text class="checker-entry-arrow">›</text>
    </view>

    <view class="section-title">选择线路</view>
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="lines.length === 0" class="empty">暂无可售线路</view>
    <view v-else class="line-list">
      <view v-for="line in lines" :key="line.id" class="line-card" @tap="openLine(line)">
        <view class="line-main">
          <text class="line-name">{{ line.name }}</text>
          <text class="line-sub">{{ line.startCity }} → {{ line.endCity }}</text>
        </view>
        <text class="line-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5faff;
  padding-bottom: 40rpx;
}
.hero {
  /* 品牌渐变 + 底部圆角外扩：与浅色内容区柔和衔接，避免硬切 */
  background: linear-gradient(160deg, #1f4e79 0%, #2f7ab8 70%, #6aa6d8 100%);
  padding: 40rpx 36rpx 96rpx;
  /* 顶部 padding 由 heroStyle 按安全区动态注入 */
  margin: 0 0 24rpx 0;
  color: #fff;
  border-radius: 0 0 56rpx 56rpx;
  box-shadow: 0 12rpx 32rpx rgba(31, 78, 121, 0.18);
}
.brand {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}
.slogan {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.8;
}
.date-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 40rpx;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}
.date-label {
  font-size: 26rpx;
  opacity: 0.85;
}
.date-value {
  font-size: 28rpx;
  font-weight: 600;
}
.section-title {
  margin: 36rpx 36rpx 16rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2d3d;
}
.checker-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 24rpx 24rpx 0;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
  border: 1rpx solid rgba(31, 78, 121, 0.08);
}
.checker-entry-icon {
  font-size: 44rpx;
}
.checker-entry-main {
  flex: 1;
}
.checker-entry-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.checker-entry-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7a8b9a;
}
.checker-entry-arrow {
  font-size: 44rpx;
  color: #b8c7d6;
}
.line-list {
  margin: 0 24rpx;
}
.line-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.line-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.line-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #7a8b9a;
}
.line-arrow {
  font-size: 44rpx;
  color: #b8c7d6;
}
.empty {
  padding: 80rpx;
  text-align: center;
  color: #7a8b9a;
  font-size: 26rpx;
}
</style>
