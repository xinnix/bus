import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages';

export default defineUniPages({
  pages: [
    {
      path: 'pages/index',
      type: 'home',
    },
    {
      path: 'pages/hi',
      type: 'page',
      layout: 'home',
    },
    {
      path: 'pages/login',
      type: 'page',
    },
    {
      path: 'pages/coupon/detail',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '优惠券详情',
      },
    },
    {
      path: 'pages/coupon/list',
      type: 'page',
    },
    {
      path: 'pages/handler/index',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '核销员工作台',
        enablePullDownRefresh: true,
      },
    },
    {
      path: 'pages/handler/records',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '核销记录',
        enablePullDownRefresh: true,
      },
    },
    {
      path: 'pages/merchant/detail',
      type: 'page',
    },
    {
      path: 'pages/merchant/list',
      type: 'page',
    },
    {
      path: 'pages/news/detail',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
      },
    },
    {
      path: 'pages/profile/index',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '核销二维码',
      },
    },
    {
      path: 'pages/qrcode/index',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '优惠卷二维码',
      },
    },
    {
      path: 'pages/redemption/confirm',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '核销确认',
      },
    },
    {
      path: 'pages/scan/index',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '扫码核销',
      },
    },
    {
      path: 'pages/wallet/index',
      type: 'page',
    },
    {
      path: 'pages/agents/index',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: 'AI 助手',
      },
    },
    {
      path: 'pages/agents/chat',
      type: 'page',
      style: {
        backgroundColor: '#F5FAFF',
        navigationStyle: 'default',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: 'AI 对话',
      },
    },
  ],
  globalStyle: {
    backgroundColor: '@bgColor',
    backgroundColorBottom: '@bgColorBottom',
    backgroundColorTop: '@bgColorTop',
    backgroundTextStyle: '@bgTxtStyle',
    navigationBarBackgroundColor: '#000000',
    navigationBarTextStyle: '@navTxtStyle',
    navigationBarTitleText: 'Vitesse-Uni',
    navigationStyle: 'custom',
  },
});
