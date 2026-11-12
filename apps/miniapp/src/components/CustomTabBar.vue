<script setup lang="ts">
import { computed } from 'vue';

interface TabItem {
  pagePath: string;
  text: string;
  icon: string;
}

const props = defineProps<{
  current: number;
}>();

const tabs: TabItem[] = [
  {
    pagePath: '/pages/index',
    text: '首页',
    icon: 'icon-shouye-shouye',
  },
  {
    pagePath: '/pages/merchant/list',
    text: '品牌',
    icon: 'icon-CRMEB-shanghu-mianxing',
  },
  {
    pagePath: '/pages/coupon/list',
    text: '优惠',
    icon: 'icon-youhuiquan',
  },
  {
    pagePath: '/pages/wallet/index',
    text: '我的',
    icon: 'icon-qianbao',
  },
];

const tabBarList = computed(() => {
  return tabs.map((item, index) => ({
    ...item,
    active: props.current === index,
  }));
});

function toLink(path: string) {
  if (props.current === tabs.findIndex((t) => t.pagePath === path)) {
    return;
  }

  // 使用 reLaunch 切换页面
  uni.redirectTo({
    url: path,
  });
}
</script>

<template>
  <view class="tabbar">
    <view class="tabbar__inner">
      <view
        v-for="(item, index) in tabBarList"
        :key="index"
        class="tab-item"
        :class="{ 'is-active': item.active }"
        @tap="toLink(item.pagePath)"
      >
        <view class="tab-icon">
          <text class="iconfont" :class="tabs[index].icon" />
        </view>
        <text class="tab-label">
          {{ item.text }}
        </text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tabbar {
  padding-bottom: env(safe-area-inset-bottom);
  height: 140rpx;

  &__inner {
    padding-bottom: inherit;
    height: inherit;
    width: 100%;
    display: flex;
    background-color: #ffffff;
    position: fixed;
    left: 0;
    bottom: 0;
    z-index: 399;
    box-shadow: 0 -8px 32px rgba(23, 28, 32, 0.04);

    .tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      position: relative;
      transition: all 0.3s ease;

      .tab-icon {
        height: 56rpx;
        width: 56rpx;
        display: flex;
        align-items: center;
        justify-content: center;

        .iconfont {
          font-size: 28px;
          color: #6e7881;
        }
      }

      .tab-label {
        font-size: 20rpx;
        line-height: 24rpx;
        color: #6e7881;
        margin-top: 6rpx;
        font-weight: 700;
        letter-spacing: 1px;
      }

      &.is-active {
        .tab-icon .iconfont {
          color: #00aeef;
        }

        .tab-label {
          color: #00aeef;
        }
      }
    }
  }
}
</style>
