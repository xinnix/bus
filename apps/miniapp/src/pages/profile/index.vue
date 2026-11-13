<script setup lang="ts">
import { useTopInset } from '@/composables/topInset';
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { uploadAvatar } from '@/api/upload';
import { authApi } from '@/api/auth';

definePage({
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#F5FAFF',
  },
});

const { topInset } = useTopInset();
const loading = ref(false);
const editing = ref(false);
const loggedOut = ref(false);
const userInfo = ref<{
  nickname?: string;
  phone?: string;
  avatar?: string;
}>({});

// 页面显示时刷新用户信息
onShow(async () => {
  const token = uni.getStorageSync('token');
  if (!token) {
    loggedOut.value = true;
    return;
  }
  loggedOut.value = false;
  // 先用本地缓存快速渲染
  const stored = uni.getStorageSync('userInfo');
  if (stored) userInfo.value = { ...stored };
  try {
    const res = await authApi.getProfile();
    if (res.data) {
      userInfo.value = { ...res.data };
      uni.setStorageSync('userInfo', res.data);
    }
  } catch (error) {
    console.error('刷新用户信息失败:', error);
  }
});

function goLogin() {
  uni.navigateTo({ url: '/pages/login' });
}

// ── 编辑态：头像 / 称呼 / 手机号 ──
async function onChooseAvatar(event: any) {
  const avatarUrl = event.detail.avatarUrl;
  if (!avatarUrl) return;
  userInfo.value.avatar = avatarUrl;

  uni.showLoading({ title: '上传头像...', mask: true });
  try {
    const permanentUrl = await uploadAvatar(avatarUrl);
    userInfo.value.avatar = permanentUrl;
    const res = await authApi.updateProfile({ avatar: permanentUrl });
    uni.setStorageSync('userInfo', { ...uni.getStorageSync('userInfo'), ...res.data });
    uni.hideLoading();
    uni.showToast({ title: '头像已更新', icon: 'success' });
  } catch (error: any) {
    uni.hideLoading();
    uni.showToast({ title: error?.message || '头像上传失败', icon: 'none' });
  }
}

function onNicknameChange(event: any) {
  if (event.detail.value) userInfo.value.nickname = event.detail.value;
}

async function getPhoneNumber(event: any) {
  if (event.detail.errMsg !== 'getPhoneNumber:ok') {
    uni.showToast({ title: '授权取消', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const res = await authApi.bindPhone(event.detail.code);
    if (res.data?.phone) {
      userInfo.value.phone = res.data.phone;
      uni.setStorageSync('userInfo', { ...uni.getStorageSync('userInfo'), phone: res.data.phone });
      uni.showToast({ title: '手机号已更新', icon: 'success' });
    } else {
      throw new Error('未获取到手机号');
    }
  } catch (error: any) {
    uni.showToast({ title: error?.message || '授权失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!userInfo.value.nickname?.trim()) {
    uni.showToast({ title: '请输入称呼', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const res = await authApi.updateProfile({
      nickname: userInfo.value.nickname.trim(),
      avatar: userInfo.value.avatar,
      phone: userInfo.value.phone,
    });
    uni.setStorageSync('userInfo', { ...uni.getStorageSync('userInfo'), ...res.data });
    uni.showToast({ title: '保存成功', icon: 'success' });
    editing.value = false;
  } catch (error: any) {
    uni.showToast({ title: error?.message || '保存失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

// ── 功能入口 ──
function notOpen() {
  uni.showToast({ title: '优惠券功能暂未开通，敬请期待', icon: 'none' });
}

function goOrders() {
  uni.navigateTo({ url: '/pages/orders/index' });
}

function contactService() {
  // open-type=contact 在未开通客服时会无响应，这里兜底提示
  uni.showToast({ title: '客服功能暂未开通，敬请期待', icon: 'none' });
}
</script>

<template>
  <view class="me-page">
    <!-- 顶部品牌渐变（延伸到状态栏顶） -->
    <view class="hero" :style="{ paddingTop: topInset + 'px' }">
      <text class="hero-title">我的</text>
    </view>

    <view class="body">
      <!-- 个人信息卡片 -->
      <view class="user-card">
        <template v-if="!loggedOut">
          <view class="user-row">
            <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
              <image
                v-if="userInfo.avatar"
                :src="userInfo.avatar"
                class="avatar-image"
                mode="aspectFill"
              />
              <view v-else class="avatar-placeholder">
                <text class="iconfont icon-yonghu avatar-placeholder-icon" />
              </view>
            </button>
            <view class="user-meta">
              <text class="user-name">{{ userInfo.nickname || '未设置称呼' }}</text>
              <text class="user-phone">{{ userInfo.phone || '未绑定手机号' }}</text>
            </view>
            <view class="edit-btn" @tap="editing = !editing">
              {{ editing ? '取消' : '编辑资料' }}
            </view>
          </view>

          <!-- 编辑表单（展开） -->
          <view v-if="editing" class="edit-form">
            <view class="form-item">
              <text class="form-label">称呼</text>
              <input
                type="nickname"
                :value="userInfo.nickname"
                class="form-input"
                placeholder="车票展示用"
                :maxlength="20"
                @blur="onNicknameChange"
              />
            </view>
            <view class="form-item">
              <text class="form-label">手机号</text>
              <view class="phone-field">
                <text :class="userInfo.phone ? 'phone-value' : 'phone-empty'">
                  {{ userInfo.phone || '未绑定' }}
                </text>
                <button
                  class="phone-btn"
                  open-type="getPhoneNumber"
                  :loading="loading"
                  @getphonenumber="getPhoneNumber"
                >
                  {{ userInfo.phone ? '更换' : '微信授权' }}
                </button>
              </view>
            </view>
            <view class="save-btn" :class="{ 'save-disabled': loading }" @tap="handleSave">
              保存修改
            </view>
          </view>
        </template>

        <template v-else>
          <view class="user-row" @tap="goLogin">
            <view class="avatar-placeholder">
              <text class="iconfont icon-yonghu avatar-placeholder-icon" />
            </view>
            <view class="user-meta">
              <text class="user-name">点击登录</text>
              <text class="user-phone">登录后可购票与管理订单</text>
            </view>
          </view>
        </template>
      </view>

      <!-- 功能入口列表 -->
      <view class="menu-card">
        <view class="menu-item" @tap="notOpen">
          <view class="menu-left">
            <image class="menu-icon-img" src="/static/menu/coupon.png" />
            <text class="menu-text">优惠券</text>
          </view>
          <text class="menu-badge">未开通</text>
        </view>
        <view class="menu-item" @tap="goOrders">
          <view class="menu-left">
            <image class="menu-icon-img" src="/static/menu/orders.png" />
            <text class="menu-text">我的订单</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        <button class="menu-item menu-contact" open-type="contact" @tap="contactService">
          <view class="menu-left">
            <image class="menu-icon-img" src="/static/menu/service.png" />
            <text class="menu-text">联系客服</text>
          </view>
          <text class="menu-arrow">›</text>
        </button>
      </view>

      <view class="version-tip">桥水出行 · P0 体验版</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.me-page {
  min-height: 100vh;
  background: #f5faff;
  box-sizing: border-box;
}

/* 顶部品牌渐变 */
.hero {
  background: linear-gradient(160deg, #1f4e79 0%, #2f7ab8 70%, #6aa6d8 100%);
  padding: 24rpx 36rpx 140rpx;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 4rpx;
}

.body {
  padding: 0 24rpx 60rpx;
  margin-top: -120rpx;
}

/* 个人信息卡片 */
.user-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(31, 78, 121, 0.08);
  margin-bottom: 24rpx;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-btn {
  padding: 0;
  background: transparent;
  border: none;
  flex-shrink: 0;

  &::after {
    border: none;
  }
}

.avatar-image,
.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(221, 244, 255, 0.4);
  border: 3rpx solid rgba(189, 200, 209, 0.25);
}

.avatar-placeholder-icon {
  font-size: 52px;
  color: #bdc8d1;
}

.user-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2d3d;
}

.user-phone {
  font-size: 24rpx;
  color: #7a8b9a;
}

.edit-btn {
  padding: 10rpx 26rpx;
  border-radius: 28rpx;
  border: 2rpx solid #00aeef;
  color: #00aeef;
  font-size: 24rpx;
  flex-shrink: 0;
}

/* 编辑表单 */
.edit-form {
  margin-top: 32rpx;
  border-top: 2rpx solid rgba(189, 200, 209, 0.25);
  padding-top: 8rpx;
}

.form-item {
  padding: 24rpx 0;
  border-bottom: 2rpx solid rgba(189, 200, 209, 0.15);
}

.form-label {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #6e7881;
  letter-spacing: 1rpx;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 72rpx;
  font-size: 30rpx;
  color: #171c20;
}

.phone-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  height: 72rpx;
}

.phone-value {
  font-size: 30rpx;
  color: #171c20;
}

.phone-empty {
  font-size: 30rpx;
  color: rgba(110, 120, 129, 0.5);
}

.phone-btn {
  padding: 6rpx 28rpx;
  background: rgba(221, 244, 255, 0.5);
  border-radius: 26rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #00aeef;

  &::after {
    border: none;
  }
}

.save-btn {
  margin-top: 28rpx;
  height: 88rpx;
  background: #00aeef;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;

  &:active {
    transform: scale(0.98);
  }
}

.save-disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 功能入口卡片 */
.menu-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 0 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(31, 78, 121, 0.08);
  margin-bottom: 32rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
  border-bottom: 2rpx solid rgba(189, 200, 209, 0.15);
  background: transparent;
  width: 100%;
  text-align: left;
  font-size: inherit;

  &::after {
    border: none;
  }

  &:last-child {
    border-bottom: none;
  }
}

.menu-contact {
  border-radius: 0;
  margin: 0;
  line-height: inherit;
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.menu-icon-img {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
}

.menu-text {
  font-size: 30rpx;
  color: #1f2d3d;
}

.menu-badge {
  font-size: 22rpx;
  color: #7a8b9a;
  background: rgba(189, 200, 209, 0.2);
  border-radius: 18rpx;
  padding: 6rpx 18rpx;
}

.menu-arrow {
  font-size: 32rpx;
  color: #bdc8d1;
}

.version-tip {
  text-align: center;
  font-size: 22rpx;
  color: rgba(122, 139, 154, 0.7);
}
</style>
