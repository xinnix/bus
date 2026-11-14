import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages';

/**
 * 小程序/H5 页面登记（唯一真理源，全量列出）。
 * 注意：@uni-helper/vite-plugin-uni-pages 的 definePage 宏只提供页面级 meta，
 * 路由注册以本文件为准；mergePages 已关闭（vite.config.ts），残留 pages.json 不会回流。
 */
export default defineUniPages({
  pages: [
    {
      path: 'pages/index',
      type: 'home',
      style: {
        navigationStyle: 'custom',
        backgroundColor: '#F5FAFF',
        navigationBarTitleText: '桥水出行',
      },
    },
    {
      path: 'pages/login',
      type: 'page',
      style: {
        navigationStyle: 'custom',
        backgroundColor: '#F5FAFF',
      },
    },
    {
      path: 'pages/trips/list',
      type: 'page',
      style: { navigationBarTitleText: '选择班次', backgroundColor: '#F5FAFF' },
    },
    {
      path: 'pages/orders/create',
      type: 'page',
      style: { navigationBarTitleText: '确认订单', backgroundColor: '#F5FAFF' },
    },
    {
      path: 'pages/tickets/index',
      type: 'page',
      style: { navigationBarTitleText: '我的车票', backgroundColor: '#F5FAFF' },
    },
    {
      path: 'pages/orders/index',
      type: 'page',
      style: { navigationBarTitleText: '我的订单', backgroundColor: '#F5FAFF' },
    },
    {
      path: 'pages/orders/detail',
      type: 'page',
      style: { navigationBarTitleText: '电子票', backgroundColor: '#F5FAFF' },
    },
    {
      path: 'pages/checker/index',
      type: 'page',
      style: { navigationBarTitleText: '核销检票', backgroundColor: '#F5FAFF' },
    },
    {
      path: 'pages/checker/trips',
      type: 'page',
      style: { navigationBarTitleText: '班次管理', backgroundColor: '#F5FAFF' },
    },
    {
      path: 'pages/profile/index',
      type: 'page',
      style: {
        navigationStyle: 'custom',
        backgroundColor: '#F5FAFF',
      },
    },
    {
      path: 'pages/agreement/user-agreement',
      type: 'page',
      style: {
        navigationStyle: 'default',
        backgroundColor: '#F5FAFF',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '用户协议',
      },
    },
    {
      path: 'pages/agreement/privacy-policy',
      type: 'page',
      style: {
        navigationStyle: 'default',
        backgroundColor: '#F5FAFF',
        navigationBarBackgroundColor: '#F5FAFF',
        navigationBarTextStyle: 'black',
        navigationBarTitleText: '隐私政策',
      },
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
  tabBar: {
    color: '#7a8b9a',
    selectedColor: '#00aeef',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index',
        text: '购票',
        iconPath: 'static/tab/ticket-gray.png',
        selectedIconPath: 'static/tab/ticket-active.png',
      },
      {
        pagePath: 'pages/tickets/index',
        text: '车票',
        iconPath: 'static/tab/pass-gray.png',
        selectedIconPath: 'static/tab/pass-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'static/tab/user-gray.png',
        selectedIconPath: 'static/tab/user-active.png',
      },
    ],
  },
  globalStyle: {
    backgroundColor: '@bgColor',
    backgroundColorBottom: '@bgColorBottom',
    backgroundColorTop: '@bgColorTop',
    backgroundTextStyle: '@bgTxtStyle',
    navigationBarBackgroundColor: '#000000',
    navigationBarTextStyle: '@navTxtStyle',
    navigationBarTitleText: '桥水出行',
    navigationStyle: 'default',
  },
});
