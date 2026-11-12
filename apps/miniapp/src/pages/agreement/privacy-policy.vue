<script setup lang="ts">
definePage({
  style: {
    navigationStyle: 'default',
    backgroundColor: '#F5FAFF',
    navigationBarBackgroundColor: '#F5FAFF',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '隐私政策',
  },
});
</script>

<template>
  <view class="privacy-container">
    <view class="content">
      <text class="title">隐私政策</text>

      <view class="intro">
        <text class="intro-text"
          >我们深知个人信息对您的重要性，您的信赖对我们非常重要，我们将按照法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。</text
        >
        <text class="intro-text"
          >鉴于此，我们制定本隐私政策并以明确的方式向您展示，请您在使用我们提供的各项服务前，仔细阅读并充分理解本隐私政策。</text
        >
      </view>

      <view class="section">
        <text class="section-title">一、我们收集的信息</text>
        <text class="paragraph">为了向您提供更好、更优、更个性化的服务，我们会收集如下信息：</text>
        <text class="paragraph"
          >1.1
          账号注册信息：您通过微信授权登录时，我们会获取您的微信OpenID、昵称、头像等基本信息。</text
        >
        <text class="paragraph"
          >1.2 手机号码：为了提供更完整的服务，我们可能需要您授权获取手机号码。</text
        >
        <text class="paragraph">1.3 交易信息：您领取优惠券、核销优惠券等操作产生的记录信息。</text>
        <text class="paragraph"
          >1.4
          设备信息：我们会收集您的设备型号、操作系统版本、设备标识符等信息，用于优化服务体验。</text
        >
      </view>

      <view class="section">
        <text class="section-title">二、我们如何使用收集的信息</text>
        <text class="paragraph">我们收集的信息将用于以下目的：</text>
        <text class="paragraph">2.1 为您提供优惠券发放、核销等核心服务功能。</text>
        <text class="paragraph">2.2 识别您身份，防止欺诈行为，保障账户安全。</text>
        <text class="paragraph">2.3 向您发送服务通知、营销推广信息（您可选择关闭）。</text>
        <text class="paragraph">2.4 改进我们的产品和服务，提升用户体验。</text>
        <text class="paragraph">2.5 进行数据分析、统计，优化运营策略。</text>
      </view>

      <view class="section">
        <text class="section-title">三、信息存储与保护</text>
        <text class="paragraph"
          >3.1 信息存储：您的个人信息将存储于中华人民共和国境内的服务器。</text
        >
        <text class="paragraph"
          >3.2
          信息保护：我们采取业界领先的技术保护措施，包括但不限于数据加密、访问控制、安全审计等，保护您的个人信息安全。</text
        >
        <text class="paragraph"
          >3.3
          安全事件处置：若不幸发生个人信息安全事件，我们将按照法律法规要求，及时向您告知安全事件的基本情况、可能影响、已采取或将要采取的处置措施等。</text
        >
      </view>

      <view class="section">
        <text class="section-title">四、信息共享</text>
        <text class="paragraph">我们不会向第三方共享您的个人信息，除非：</text>
        <text class="paragraph">4.1 获得您的明确同意。</text>
        <text class="paragraph">4.2 根据法律法规规定或行政、司法机关依法要求。</text>
        <text class="paragraph"
          >4.3
          与授权合作伙伴共享：我们可能会与商户等合作伙伴共享必要的用户信息，以完成优惠券发放和核销服务。</text
        >
      </view>

      <view class="section">
        <text class="section-title">五、您的权利</text>
        <text class="paragraph">5.1 访问权：您有权访问您的个人信息，我们会在您请求时提供。</text>
        <text class="paragraph">5.2 更正权：您有权要求我们更正不准确或不完整的个人信息。</text>
        <text class="paragraph"
          >5.3 删除权：您有权要求我们删除您的个人信息，我们会在法律法规允许的范围内尽快处理。</text
        >
        <text class="paragraph"
          >5.4 注销权：您可以申请注销账号，注销后我们将停止为您提供服务并删除您的个人信息。</text
        >
        <text class="paragraph">5.5 撤回同意权：您可以撤回之前给予我们的授权同意。</text>
      </view>

      <view class="section">
        <text class="section-title">六、未成年人保护</text>
        <text class="paragraph">6.1 我们高度重视未成年人的个人信息保护。</text>
        <text class="paragraph"
          >6.2
          如您为未成年人，请在监护人指导下阅读本政策，并在取得监护人同意后使用我们的服务。</text
        >
        <text class="paragraph"
          >6.3
          如您的监护人不同意您使用我们的服务或向我们提供信息，请您立即终止使用我们的服务并及时通知我们。</text
        >
      </view>

      <view class="section">
        <text class="section-title">七、本政策的更新</text>
        <text class="paragraph">7.1 我们可能适时修订本政策内容。</text>
        <text class="paragraph"
          >7.2 如该修订变更您的权利义务，我们会通过页面公告、弹窗提示等方式通知您。</text
        >
        <text class="paragraph"
          >7.3
          对于重大变更，我们还会提供更为显著的通知形式，如您继续使用我们的服务，即表示您同意接受修订后的政策。</text
        >
      </view>

      <view class="section">
        <text class="section-title">八、联系我们</text>
        <text class="paragraph"
          >如您对本隐私政策有任何疑问、意见或建议，可通过以下方式与我们联系：</text
        >
        <text class="paragraph">客服邮箱：support@example.com</text>
        <text class="paragraph">我们将在15个工作日内回复您的请求。</text>
      </view>

      <view class="footer">
        <text class="update-time">本政策最后更新时间：2024年4月</text>
        <text class="effective-time">生效时间：2024年4月</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.privacy-container {
  min-height: 100vh;
  background: #f5faff;
  padding: 32rpx;
}

.content {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}

.intro {
  background: rgba(0, 174, 239, 0.08);
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 40rpx;
}

.intro-text {
  font-size: 24rpx;
  line-height: 40rpx;
  color: #00aeef;
  display: block;
  margin-bottom: 8rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
  margin-bottom: 24rpx;
}

.paragraph {
  font-size: 24rpx;
  line-height: 40rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.footer {
  margin-top: 60rpx;
  text-align: center;
}

.update-time,
.effective-time {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}
</style>
