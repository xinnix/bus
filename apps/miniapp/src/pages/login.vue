<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { authApi } from '@/api/auth';
import { refreshCheckerIdentity } from '@/utils/checkerIdentity';

definePage({
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#F5FAFF',
  },
});

const statusBarHeight = ref(0);
const loading = ref(false);
const agreed = ref(false);
// 第一步完成后进入第二步
const step = ref(1);
// 登录后要跳转的目标页面
const redirectUrl = ref('');

onLoad((options: any) => {
  // 接收跳转参数
  if (options && options.redirect) {
    redirectUrl.value = decodeURIComponent(options.redirect);
  }
});

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 0;
});

// 第一步：微信登录（获取 openid，建立用户）
// 浏览器 H5 无微信运行时：走后端 dev-login（仅 NODE_ENV!==production 开放），复用 seed 测试乘客
const DEV_LOGIN_PHONE = '13800138000';

async function onLoginTap() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    let res: Awaited<ReturnType<typeof authApi.wechatLogin>> | null = null;
    // #ifdef MP-WEIXIN
    const codeRes = await uni.login({ provider: 'weixin' });
    if (!codeRes.code) throw new Error('获取登录凭证失败');
    res = await authApi.wechatLogin(codeRes.code);
    // #endif
    // #ifdef H5
    res = await authApi.devLogin(DEV_LOGIN_PHONE);
    // #endif
    if (!res) throw new Error('当前平台暂不支持登录');

    uni.setStorageSync('token', res.data.accessToken);
    uni.setStorageSync('refreshToken', res.data.refreshToken);
    uni.setStorageSync('userInfo', res.data.user);

    // 称呼与手机号齐全则直接进入，否则进入「完善个人信息」
    const user = res.data.user as any;
    profileName.value = user?.nickname || '';
    profilePhone.value = user?.phone || '';
    if (user?.phone && user?.nickname) {
      navigateAfterLogin();
    } else {
      step.value = 2;
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

// 第二步：完善个人信息（称呼 + 手机号），购票时自动填充
const profileName = ref('');
const profilePhone = ref('');

// 微信一键授权手机号：仅填入表单，统一由「保存」提交
async function handleGetPhoneNumber(event: any) {
  if (event.detail.errMsg !== 'getPhoneNumber:ok') return;
  loading.value = true;
  try {
    const res = await authApi.bindPhone(event.detail.code);
    if (res.data?.phone) {
      profilePhone.value = res.data.phone;
      uni.showToast({ title: '手机号已填入', icon: 'none' });
    }
  } catch (error: any) {
    uni.showToast({ title: error?.message || '授权失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  const name = profileName.value.trim();
  const phone = profilePhone.value.trim();
  if (!name) {
    uni.showToast({ title: '请填写称呼', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(phone)) {
    uni.showToast({ title: '请填写正确的手机号', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const res = await authApi.updateProfile({ nickname: name, phone });
    // 同步到本地缓存，购票页自动填充依赖
    const stored = uni.getStorageSync('userInfo') || {};
    uni.setStorageSync('userInfo', { ...stored, ...res.data, nickname: name, phone });
    navigateAfterLogin();
  } catch (error: any) {
    uni.showToast({ title: error?.message || '保存失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

// 跳过完善，直接进入
function skipPhoneNumber() {
  navigateAfterLogin();
}

async function navigateAfterLogin() {
  uni.showToast({ title: '登录成功', icon: 'success' });

  // 登录后检查身份：手机号与核销员一致时绑定 openid，首页据此展示「验票工作台」入口
  refreshCheckerIdentity();

  if (redirectUrl.value) {
    setTimeout(() => {
      uni.navigateBack({ delta: 1 });
    }, 1000);
  } else {
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index' });
    }, 1000);
  }
}

// 跳转到用户协议页面
function navigateToUserAgreement() {
  uni.navigateTo({ url: '/pages/agreement/user-agreement' });
}

// 跳转到隐私政策页面
function navigateToPrivacyPolicy() {
  uni.navigateTo({ url: '/pages/agreement/privacy-policy' });
}
</script>

<template>
  <view class="login-container">
    <!-- 背景品牌图案 -->
    <view
      class="brand-pattern pointer-events-none fixed left-0 top-0 z--1 h-full w-full"
      :style="{
        backgroundImage: 'url(../static/bg.png)',
        backgroundRepeat: 'repeat',
        backgroundSize: '400rpx',
        backgroundPosition: 'center',
        opacity: 0.03,
      }"
    />

    <!-- Logo -->
    <view class="login-content">
      <!-- 第一步：微信登录 -->
      <template v-if="step === 1">
        <view class="login-header">
          <image class="logo-image" src="/static/logo.png" mode="aspectFit" />
          <text class="title text-on-surface font-extrabold"> 桥水出行 </text>
          <text class="subtitle text-on-surface-variant"> 欢迎回来，开启便捷出行 </text>
        </view>

        <view class="wechat-login-btn" :class="{ disabled: loading }" @tap="onLoginTap">
          <view class="btn-content">
            <text class="btn-icon iconfont icon-weixin" />
            <text class="btn-text"> 微信一键登录 </text>
          </view>
        </view>

        <view class="agreement" @tap.stop="agreed = !agreed">
          <view class="checkbox" :class="{ checked: agreed }">
            <text v-if="agreed" class="check-icon">✓</text>
          </view>
          <view class="agreement-text">
            <text class="tip">我已阅读并同意</text>
            <text class="link" @tap.stop="navigateToUserAgreement">《用户协议》</text>
            <text class="tip">和</text>
            <text class="link" @tap.stop="navigateToPrivacyPolicy">《隐私政策》</text>
          </view>
        </view>
      </template>

      <!-- 第二步：完善个人信息 -->
      <template v-if="step === 2">
        <view class="login-header">
          <view class="phone-icon-wrap">
            <text class="phone-icon">📝</text>
          </view>
          <text class="title text-on-surface font-extrabold"> 完善个人信息 </text>
          <text class="subtitle text-on-surface-variant"> 方便购票时自动填充，无需重复输入 </text>
        </view>

        <view class="profile-form">
          <view class="form-field">
            <text class="form-label">称呼</text>
            <input
              v-model="profileName"
              class="form-input"
              placeholder="怎么称呼您（车票展示用）"
              :maxlength="20"
            />
          </view>
          <view class="form-field">
            <text class="form-label">手机号</text>
            <input
              v-model="profilePhone"
              class="form-input"
              type="number"
              :maxlength="11"
              placeholder="用于接收出行信息"
            />
          </view>
          <!-- #ifdef MP-WEIXIN -->
          <button
            class="wechat-login-btn phone-btn quick-fill"
            open-type="getPhoneNumber"
            :loading="loading"
            @getphonenumber="handleGetPhoneNumber"
          >
            <view class="btn-content">
              <text class="btn-text"> 微信一键填入手机号 </text>
            </view>
          </button>
          <!-- #endif -->
        </view>

        <button class="save-btn" :class="{ disabled: loading }" @tap="saveProfile">
          保存并进入
        </button>

        <view class="skip-btn" @tap="skipPhoneNumber">
          <text class="skip-text">暂不完善，先去看看</text>
        </view>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* 登录容器 */
.login-container {
  min-height: 100vh;
  background: #f5faff;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 品牌图案背景 */
.brand-pattern {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

/* Logo 图片 */
.logo-image {
  width: 200rpx;
  height: 200rpx;
  margin: 0 auto 40rpx;
  display: block;
  border-radius: 36rpx;
  box-shadow: 0 8rpx 32rpx rgba(31, 78, 121, 0.15);
}

/* 主内容区域 */
.login-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 60rpx;
}

/* 登录头部 */
.login-header {
  text-align: center;
  margin-bottom: 80rpx;
}

/* 标题 */
.title {
  font-size: 48rpx;
  margin-bottom: 16rpx;
  display: block;
}

.subtitle {
  font-size: 28rpx;
  font-weight: 500;
  display: block;
}

/* 微信登录按钮 */
.wechat-login-btn {
  width: 100%;
  height: 96rpx;
  background: #00aeef;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 174, 239, 0.25);
  border: none;
  margin-bottom: 40rpx;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
  }
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.btn-icon {
  font-size: 32px;
  color: #ffffff;
}

.btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

/* 协议勾选 */
.agreement {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 32rpx;
  padding: 0 8rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  min-width: 36rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(189, 200, 209, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
  transition: all 0.2s ease;

  &.checked {
    background: #00aeef;
    border-color: #00aeef;
  }
}

.check-icon {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 700;
}

.agreement-text {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  line-height: 40rpx;
}

/* 手机号图标 */
.phone-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(23, 28, 32, 0.04);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}

.phone-icon {
  font-size: 48px;
}

.phone-btn {
  background: #00aeef;
  color: #ffffff;
  border: none;
  margin-bottom: 24rpx;

  &::after {
    border: none;
  }
}

/* 跳过按钮 */
.profile-form {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 10rpx 28rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(23, 28, 32, 0.04);
  border: 2rpx solid rgba(189, 200, 209, 0.2);
}
.form-field {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx 0;
  border-bottom: 2rpx solid rgba(189, 200, 209, 0.25);
}
.form-field:last-child {
  border-bottom: none;
}
.form-label {
  width: 110rpx;
  font-size: 28rpx;
  color: rgba(110, 120, 129, 0.9);
  flex-shrink: 0;
}
.form-input {
  flex: 1;
  font-size: 30rpx;
  color: #1f2d3d;
}
.save-btn {
  width: 100%;
  height: 96rpx;
  background: #00aeef;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 174, 239, 0.25);
  border: none;
  margin-bottom: 24rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;

  &::after {
    border: none;
  }

  &:active {
    transform: scale(0.98);
  }
}
.quick-fill {
  height: 84rpx;
  font-size: 28rpx;
  margin-top: 24rpx;
  margin-bottom: 8rpx;
}
.skip-btn {
  padding: 20rpx 0;
}

.skip-text {
  font-size: 28rpx;
  color: rgba(110, 120, 129, 0.8);
  font-weight: 500;
}

.tip {
  font-size: 24rpx;
  color: rgba(110, 120, 129, 0.6);
  font-weight: 500;
}

.link {
  font-size: 24rpx;
  color: #00aeef;
  font-weight: 600;
}
</style>
