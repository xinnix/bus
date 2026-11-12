<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { authApi } from '@/api/auth';

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
async function onLoginTap() {
  if (!agreed.value) {
    uni.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
    return;
  }

  loading.value = true;
  try {
    const codeRes = await uni.login({ provider: 'weixin' });
    const code = codeRes.code;
    if (!code) throw new Error('获取登录凭证失败');

    const res = await authApi.wechatLogin(code);

    uni.setStorageSync('token', res.data.accessToken);
    uni.setStorageSync('refreshToken', res.data.refreshToken);
    uni.setStorageSync('userInfo', res.data.user);

    // 用户已有手机号则跳过第二步，否则进入第二步获取手机号
    step.value = 2;
  } catch (error: any) {
    uni.showToast({ title: error.message || '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

// 第二步：获取手机号
async function handleGetPhoneNumber(event: any) {
  if (event.detail.errMsg !== 'getPhoneNumber:ok') {
    // 用户拒绝授权，直接跳转首页
    navigateAfterLogin();
    return;
  }

  loading.value = true;
  try {
    // 手机号获取 - 留空供业务方实现
    console.log('手机号授权:', event.detail.code);
  } catch (error) {
    console.error('手机号授权失败', error);
  } finally {
    loading.value = false;
    navigateAfterLogin();
  }
}

// 跳过手机号，直接进入
function skipPhoneNumber() {
  navigateAfterLogin();
}

async function navigateAfterLogin() {
  uni.showToast({ title: '登录成功', icon: 'success' });

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
          <text class="title text-on-surface font-extrabold"> 欢迎回来 </text>
          <text class="subtitle text-on-surface-variant"> 登录开启精彩体验 </text>
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

      <!-- 第二步：获取手机号 -->
      <template v-if="step === 2">
        <view class="login-header">
          <view class="phone-icon-wrap">
            <text class="phone-icon">📱</text>
          </view>
          <text class="title text-on-surface font-extrabold"> 绑定手机号 </text>
          <text class="subtitle text-on-surface-variant"> 绑定手机号以获得更好的服务体验 </text>
        </view>

        <button
          class="wechat-login-btn phone-btn"
          open-type="getPhoneNumber"
          :loading="loading"
          @getphonenumber="handleGetPhoneNumber"
        >
          <view class="btn-content">
            <text class="btn-text"> 授权手机号 </text>
          </view>
        </button>

        <view class="skip-btn" @tap="skipPhoneNumber">
          <text class="skip-text">暂不绑定，先去看看</text>
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
  width: 280rpx;
  height: 112rpx;
  margin: 0 auto 40rpx;
  display: block;
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
