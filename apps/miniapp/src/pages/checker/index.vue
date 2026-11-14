<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { checkerApi } from '@/api/ticketing';

definePage({
  style: { navigationBarTitleText: '核销检票', backgroundColor: '#F5FAFF' },
});

const phone = ref('');
const password = ref('');
// 核销员会话独立存储，避免与乘客登录态（token）互相覆盖
const loggedIn = ref(!!uni.getStorageSync('checkerToken'));
const checkerName = ref(uni.getStorageSync('checkerName') || '');
const loading = ref(false);
const result = ref<any>(null);
const manualCode = ref('');
const records = ref<any[]>([]);
// 通过小程序码 scene / 链接参数带入的核销码，待核销员身份就绪后自动核销
const pendingCode = ref('');

// 预留「微信扫小程序码直达核验」挂点：wxacode 的 scene（URL 编码，≤32 可见字符）
// 计划承载核销码；同时兼容普通 query 传参 ?code=
onLoad((options: any) => {
  const scene = options?.scene ? decodeURIComponent(String(options.scene)) : '';
  const code = String(options?.code || scene || '').trim();
  if (/^[A-Za-z0-9]{1,32}$/.test(code)) pendingCode.value = code;
});

// 已绑定身份（openid）的核销员免密进入工作台；失败静默回落到下方手机号+密码表单。
// 仅挂载时尝试一次：手动「退出」后不在本页实例内自动重登。
onMounted(async () => {
  if (!loggedIn.value && uni.getStorageSync('token')) {
    try {
      const res = await checkerApi.openidLogin();
      uni.setStorageSync('checkerToken', res.data.accessToken);
      uni.setStorageSync('checkerName', res.data.checker.name);
      checkerName.value = res.data.checker.name;
      loggedIn.value = true;
    } catch {
      // 未绑定 / 身份失效：保留密码登录表单
    }
  }
  await tryAutoVerify();
});

/**
 * 自动核销外部带入的核销码：身份未就绪时暂存，登录成功后由 login() 补核销。
 */
async function tryAutoVerify() {
  if (!pendingCode.value || !loggedIn.value) return;
  const code = pendingCode.value;
  pendingCode.value = '';
  await verify({ code });
}

async function login() {
  if (!/^1\d{10}$/.test(phone.value) || !password.value) {
    uni.showToast({ title: '请输入手机号和密码', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const res = await checkerApi.login(phone.value, password.value);
    uni.setStorageSync('checkerToken', res.data.accessToken);
    uni.setStorageSync('checkerName', res.data.checker.name);
    checkerName.value = res.data.checker.name;
    loggedIn.value = true;
    uni.showToast({ title: '登录成功', icon: 'success' });
    // 扫小程序码/链接进入但身份未就绪的场景：登录成功后补核销
    await tryAutoVerify();
  } catch (e: any) {
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

/** 从小程序码扫码结果中提取 scene（微信扫本小程序的小程序码时 path 携带 scene 参数） */
function extractScene(value: string): string {
  const match = value.match(/scene=([A-Za-z0-9]{1,32})/);
  return match ? match[1] : '';
}

async function scan() {
  try {
    const scanResult: any = await uni.scanCode({ onlyFromCamera: false });
    const raw = String(scanResult?.result || '').trim();
    const path = String(scanResult?.path || '').trim();
    // 1) 自有 HMAC 二维码 token（base64url，电子票备用码）
    if (/^[A-Za-z0-9_-]{40,}$/.test(raw)) {
      return verify({ qrToken: raw });
    }
    // 2) 6 位核销码
    if (/^\d{6}$/.test(raw)) {
      return verify({ code: raw });
    }
    // 3) 微信小程序码：本小程序的码会带回 path（pages/checker/index?scene=xxx）
    const scene = [path, raw].map(extractScene).find(Boolean);
    if (scene) {
      return verify({ code: scene });
    }
    uni.showToast({ title: '未识别的码，请手动输入核销码', icon: 'none' });
  } catch (e: any) {
    if (e?.errMsg && !e.errMsg.includes('cancel')) {
      uni.showToast({ title: '扫码失败', icon: 'none' });
    }
  }
}

async function verifyManual() {
  if (!manualCode.value.trim()) {
    uni.showToast({ title: '请输入核销码', icon: 'none' });
    return;
  }
  await verify({ code: manualCode.value.trim() });
}

async function verify(payload: { code?: string; qrToken?: string }) {
  loading.value = true;
  result.value = null;
  try {
    const res = await checkerApi.verify(payload);
    result.value = res.data;
  } catch (e: any) {
    result.value = { success: false, message: e?.message || '核销失败' };
  } finally {
    loading.value = false;
  }
}

function logout() {
  uni.removeStorageSync('checkerToken');
  loggedIn.value = false;
}

/** 班次处置工作台：余票看板 / 调余票 / 上下线 */
function openTrips() {
  uni.navigateTo({ url: '/pages/checker/trips' });
}

async function loadRecords() {
  try {
    const res = await checkerApi.records();
    records.value = res.data || [];
  } catch (e) {
    uni.showToast({ title: '记录加载失败', icon: 'none' });
  }
}
</script>

<template>
  <view class="page">
    <view v-if="!loggedIn" class="login-card">
      <text class="title">核销员登录</text>
      <input v-model="phone" class="input" type="number" :maxlength="11" placeholder="手机号" />
      <input v-model="password" class="input" password placeholder="密码" />
      <button class="primary-btn" :loading="loading" @tap="login">登录</button>
    </view>

    <template v-else>
      <view class="checker-head">
        <text class="hello">核销员：{{ checkerName }}</text>
        <text class="logout" @tap="logout">退出</text>
      </view>

      <view class="scan-card">
        <button class="scan-btn" @tap="scan">扫乘客二维码核销</button>
        <view class="manual-row">
          <input
            v-model="manualCode"
            class="manual-input"
            type="number"
            :maxlength="6"
            placeholder="或输入6位核销码"
          />
          <button class="manual-btn" @tap="verifyManual">核销</button>
        </view>
      </view>

      <button class="records-btn trips-entry" @tap="openTrips">班次管理 · 余票看板 / 上下线</button>

      <view
        v-if="result"
        class="result-card"
        :class="{ success: result.success, fail: !result.success }"
      >
        <text class="result-title">{{ result.success ? '核销成功' : '核销提示' }}</text>
        <text class="result-message">{{ result.message }}</text>
        <view v-if="result.ticket" class="ticket-info">
          <text>票号：{{ result.ticket.ticketNo }}</text>
          <text>乘车人：{{ result.ticket.passengerName }}</text>
          <text v-if="result.ticket.lineName">线路：{{ result.ticket.lineName }}</text>
        </view>
      </view>

      <button class="records-btn" @tap="loadRecords">查看我的核销记录</button>
      <view v-if="records.length" class="records">
        <view v-for="item in records" :key="item.id" class="record-item">
          <text>{{ item.ticket?.passengerName }} · {{ item.ticket?.ticketNo }}</text>
          <text class="record-time">{{ item.checkedAt }}</text>
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
.login-card,
.scan-card,
.result-card,
.records {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 28rpx;
}
.input {
  height: 88rpx;
  border: 1rpx solid #dbe6f0;
  border-radius: 12rpx;
  padding: 0 24rpx;
  margin-bottom: 18rpx;
  font-size: 28rpx;
}
.primary-btn,
.scan-btn,
.records-btn {
  height: 86rpx;
  line-height: 86rpx;
  border-radius: 43rpx;
  background: #1f4e79;
  color: #fff;
  font-size: 30rpx;
}
.checker-head {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 8rpx 24rpx;
  color: #1f2d3d;
  font-size: 26rpx;
}
.logout {
  color: #7a8b9a;
}
.manual-row {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.manual-input {
  flex: 1;
  height: 80rpx;
  border: 1rpx solid #dbe6f0;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}
.manual-btn {
  width: 160rpx;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  background: #e8f1fa;
  color: #1f4e79;
  font-size: 26rpx;
  margin: 0;
}
.result-card.success {
  border-left: 8rpx solid #2e9e5b;
}
.result-card.fail {
  border-left: 8rpx solid #e85d3f;
}
.result-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 12rpx;
}
.result-message {
  display: block;
  font-size: 26rpx;
  color: #556b7e;
}
.ticket-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #7a8b9a;
}
.records-btn {
  background: #e8f1fa;
  color: #1f4e79;
  margin-bottom: 20rpx;
}
.trips-entry {
  margin-top: 4rpx;
}
.record-item {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #1f2d3d;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f4f8;
}
.record-time {
  color: #7a8b9a;
}
</style>
