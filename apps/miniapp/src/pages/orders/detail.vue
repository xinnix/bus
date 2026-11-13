<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { orderApi, type Order, type Ticket } from '@/api/ticketing';
import { requestWechatPay } from '@/composables/pay';
import { makeQrMatrix, type QrMatrix } from '@/utils/qr';

definePage({
  style: { navigationBarTitleText: '电子票', backgroundColor: '#F5FAFF' },
});

/** 电子票视图模型：附加二维码矩阵（1=黑格），生成失败时降级为仅展示核销码 */
interface TicketView extends Ticket {
  qr?: QrMatrix;
  qrFailed?: boolean;
  /** 微信小程序码（后端出图 dataURL）：成功后替换本地矩阵，核票员微信扫一扫可直达核验 */
  wxacode?: string;
}

const order = ref<Order | null>(null);
const tickets = ref<TicketView[]>([]);
const loading = ref(true);
const paying = ref(false);

async function loadOrder(id: string) {
  const res = await orderApi.detail(id);
  order.value = res.data;
  // 二维码内容优先 HMAC qrToken（防伪、按时失效），接口未下发时回退核销码
  tickets.value = (res.data.tickets || []).map((ticket) => {
    try {
      return { ...ticket, qr: makeQrMatrix(ticket.qrToken || ticket.checkCode) };
    } catch {
      return { ...ticket, qrFailed: true };
    }
  });
  // 小程序码异步拉取：成功则替换本地矩阵；失败（微信配置缺失/接口异常）静默保留矩阵兜底
  tickets.value.forEach((ticket) => {
    orderApi
      .wxacode(res.data.id, ticket.id)
      .then((result) => {
        const target = tickets.value.find((item) => item.id === ticket.id);
        if (target) target.wxacode = result.data.image;
      })
      .catch(() => {});
  });
}

onLoad(async (options: any) => {
  if (!options.id) return;
  try {
    await loadOrder(options.id);
  } catch (e) {
    uni.showToast({ title: '订单加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

async function payOrder() {
  if (!order.value || paying.value) return;
  paying.value = true;
  try {
    await requestWechatPay(order.value.id);
    uni.showToast({ title: '支付成功', icon: 'success' });
    await loadOrder(order.value.id);
  } catch (error: any) {
    uni.showToast({ title: error?.message || '支付未完成', icon: 'none' });
  } finally {
    paying.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!order" class="empty">订单不存在</view>
    <template v-else>
      <view class="summary">
        <text class="line-name">{{ order.line?.name }}</text>
        <text class="meta">{{ order.trip?.serviceDate }} {{ order.trip?.departureTime }}</text>
        <text class="meta">{{ order.contactName }} · {{ order.contactPhone }}</text>
      </view>

      <view v-if="order.orderStatus === 'PENDING_PAYMENT'" class="banner pending">
        <text>订单待支付，支付完成后出票</text>
        <button class="pay-btn" :disabled="paying" @tap="payOrder">去支付</button>
      </view>
      <view v-else-if="order.orderStatus === 'CLOSED'" class="banner closed">
        <text>订单已关闭</text>
      </view>

      <view v-for="ticket in tickets" :key="ticket.id" class="ticket-card">
        <view class="ticket-head">
          <text class="passenger">{{ ticket.passengerName }}</text>
          <text class="ticket-no">{{ ticket.ticketNo }}</text>
        </view>
        <view v-if="ticket.wxacode" class="qr-area">
          <view class="qr-wrap">
            <image class="wxacode" :src="ticket.wxacode" mode="aspectFit" />
          </view>
        </view>
        <view v-else-if="ticket.qr" class="qr-area">
          <view class="qr-wrap">
            <view v-for="(row, rowIndex) in ticket.qr.rows" :key="rowIndex" class="qr-row">
              <view
                v-for="(dark, colIndex) in row"
                :key="colIndex"
                class="qr-cell"
                :class="{ black: dark === 1 }"
                :style="'width:' + ticket.qr!.cellRpx + 'rpx;height:' + ticket.qr!.cellRpx + 'rpx'"
              />
            </view>
          </view>
        </view>
        <text v-else-if="ticket.qrFailed" class="qr-fallback"
          >二维码生成失败，请出示下方核销码</text
        >
        <text class="check-code">核销码：{{ ticket.checkCode }}</text>
        <text class="tip">上车时请向检票员出示二维码</text>
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
.summary {
  background: linear-gradient(135deg, #1f4e79, #2f7ab8);
  color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}
.line-name {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
}
.meta {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  opacity: 0.85;
}
.ticket-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(31, 78, 121, 0.06);
}
.ticket-head {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #7a8b9a;
}
.passenger {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}
.qr-area {
  display: flex;
  justify-content: center;
  margin: 24rpx 0;
}
.qr-wrap {
  display: inline-block;
  background: #fff;
  /* 白边（quiet zone）：扫码识别需要足够留白 */
  padding: 24rpx;
  border: 1rpx solid #eef3f8;
  border-radius: 8rpx;
}
.qr-row {
  display: flex;
}
.qr-cell {
  background: #fff;
}
.qr-cell.black {
  background: #111;
}
.wxacode {
  width: 432rpx;
  height: 432rpx;
  display: block;
}
.qr-fallback {
  display: block;
  margin: 24rpx 0;
  font-size: 24rpx;
  color: #e85d3f;
}
.check-code {
  display: block;
  font-size: 28rpx;
  color: #1f2d3d;
  font-weight: 600;
}
.tip {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #7a8b9a;
}
.empty {
  padding-top: 200rpx;
  text-align: center;
  color: #7a8b9a;
}
.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 20rpx;
  font-size: 26rpx;
}
.banner.pending {
  color: #e85d3f;
  box-shadow: 0 8rpx 24rpx rgba(232, 93, 63, 0.12);
}
.banner.closed {
  color: #7a8b9a;
}
.pay-btn {
  margin: 0;
  padding: 0 28rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 30rpx;
  background: #e85d3f;
  color: #fff;
  font-size: 26rpx;
}
</style>
