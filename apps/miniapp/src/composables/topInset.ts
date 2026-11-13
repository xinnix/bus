import { computed, ref } from 'vue';

/**
 * 顶部安全区高度（px）：状态栏 + 胶囊行高。
 * 全局 navigationStyle=custom，需要顶到屏幕顶端做品牌色的页面（如首页 hero）
 * 与普通页面（layout 占位）共用同一数值，保证视觉一致。
 */
const statusBarHeight = ref(0);
const navBarHeight = ref(44);
const topInset = computed(() => statusBarHeight.value + navBarHeight.value);
let initialized = false;

export function useTopInset() {
  if (!initialized) {
    initialized = true;
    try {
      const sys = uni.getSystemInfoSync();
      statusBarHeight.value = sys.statusBarHeight || 0;
      // #ifdef MP-WEIXIN
      const menu = uni.getMenuButtonBoundingClientRect?.();
      if (menu && menu.height) {
        navBarHeight.value = menu.bottom + 8 - statusBarHeight.value;
      }
      // #endif
    } catch {
      statusBarHeight.value = 0;
    }
  }
  return { statusBarHeight, navBarHeight, topInset };
}
