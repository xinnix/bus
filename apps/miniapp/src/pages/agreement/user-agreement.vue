<script setup lang="ts">
definePage({
  style: {
    navigationStyle: 'default',
    backgroundColor: '#F5FAFF',
    navigationBarBackgroundColor: '#F5FAFF',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '用户协议',
  },
});
</script>

<template>
  <view class="agreement-container">
    <view class="content">
      <text class="title">用户服务协议</text>

      <view class="section">
        <text class="section-title">一、协议的接受与修改</text>
        <text class="paragraph"
          >1.1
          本协议是用户（以下简称"您"）与本平台（以下简称"我们"）之间关于使用本平台服务所订立的协议。</text
        >
        <text class="paragraph"
          >1.2
          您通过网络页面点击确认或以其他方式选择接受本协议，即表示您与我们已达成协议并同意接受本协议的全部约定内容。</text
        >
        <text class="paragraph"
          >1.3 我们有权在必要时修改本协议条款，您可以在相关服务页面查阅最新版本的协议条款。</text
        >
      </view>

      <view class="section">
        <text class="section-title">二、账号注册与使用</text>
        <text class="paragraph"
          >2.1 您需要通过微信授权方式注册账号，账号注册成功后，您将成为本平台的正式用户。</text
        >
        <text class="paragraph"
          >2.2
          您应当对账号的安全负责，因您保管不当可能造成的账号被盗、密码泄露等后果，由您自行承担。</text
        >
        <text class="paragraph"
          >2.3
          您不得将账号转让、出借、出租给他人使用，因账号转让、出借、出租给他人使用所产生的一切后果，由您自行承担。</text
        >
      </view>

      <view class="section">
        <text class="section-title">三、用户行为规范</text>
        <text class="paragraph"
          >3.1 您在使用本平台服务时，必须遵守中华人民共和国相关法律法规。</text
        >
        <text class="paragraph">3.2 您不得利用本平台从事以下活动：</text>
        <text class="paragraph"> (1) 发布、传送、传播、储存违反国家法律法规的内容；</text>
        <text class="paragraph">
          (2)
          发布、传送、传播、储存侵害他人名誉权、肖像权、知识产权、商业秘密等合法权利的内容；</text
        >
        <text class="paragraph">
          (3) 发布、传送、传播、储存涉及他人隐私、个人信息或资料的内容；</text
        >
        <text class="paragraph"> (4) 发布、传送、传播骚扰、广告信息及垃圾信息；</text>
        <text class="paragraph"> (5) 其他违反法律法规、政策及公序良俗、社会公德等的行为。</text>
      </view>

      <view class="section">
        <text class="section-title">四、服务内容</text>
        <text class="paragraph">4.1 本平台为用户提供优惠券发放、核销等相关服务。</text>
        <text class="paragraph"
          >4.2 我们有权根据业务发展需要调整、暂停、终止部分或全部服务，并提前公告。</text
        >
        <text class="paragraph"
          >4.3 因系统维护、升级等原因，我们可能暂停部分服务，我们会尽可能提前通知。</text
        >
      </view>

      <view class="section">
        <text class="section-title">五、知识产权</text>
        <text class="paragraph"
          >5.1
          本平台的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、版面设计等的知识产权归我们所有。</text
        >
        <text class="paragraph"
          >5.2
          未经我们书面许可，您不得复制、转载、引用、链接、抓取或以其他方式使用本平台的内容。</text
        >
      </view>

      <view class="section">
        <text class="section-title">六、免责声明</text>
        <text class="paragraph"
          >6.1
          您理解并同意，本平台仅提供信息发布及优惠券发放平台，不对用户发布的任何信息内容的真实性、合法性负责。</text
        >
        <text class="paragraph"
          >6.2 因不可抗力或其他我们无法控制的原因造成的服务中断或终止，我们不承担责任。</text
        >
      </view>

      <view class="section">
        <text class="section-title">七、协议终止</text>
        <text class="paragraph">7.1 您有权随时申请注销账号，注销后本协议终止。</text>
        <text class="paragraph"
          >7.2 如您违反本协议约定，我们有权终止向您提供服务并注销您的账号。</text
        >
      </view>

      <view class="section">
        <text class="section-title">八、争议解决</text>
        <text class="paragraph"
          >8.1 本协议的签订、履行、解释及争议解决均适用中华人民共和国法律。</text
        >
        <text class="paragraph"
          >8.2
          如就本协议内容或其执行发生任何争议，双方应尽力友好协商解决；协商不成时，任何一方均可向我们所在地有管辖权的人民法院提起诉讼。</text
        >
      </view>

      <view class="footer">
        <text class="update-time">本协议最后更新时间：2024年4月</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.agreement-container {
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
  margin-bottom: 48rpx;
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

.update-time {
  font-size: 24rpx;
  color: #999;
}
</style>
