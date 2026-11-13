/**
 * 用户相关 API
 */
import { http } from '@/utils/http';
import { API_ENDPOINTS } from '@/config/api';

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phone?: string;
  nickname?: string;
}

export interface AuthResponse {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  /**
   * 用户登录
   */
  login: (params: LoginParams) => {
    return http.post<AuthResponse>(API_ENDPOINTS.login, params);
  },

  /**
   * 用户注册
   */
  register: (params: RegisterParams) => {
    return http.post<AuthResponse>(API_ENDPOINTS.register, params);
  },

  /**
   * 用户登出
   */
  logout: (refreshToken?: string) => {
    return http.post(API_ENDPOINTS.logout, {
      refreshToken: refreshToken || uni.getStorageSync('refreshToken') || '',
    });
  },

  /**
   * 获取用户信息
   */
  getProfile: () => {
    return http.get<UserInfo>(API_ENDPOINTS.profile);
  },

  /**
   * 微信登录
   */
  wechatLogin: (code: string) => http.post<AuthResponse>(API_ENDPOINTS.wechatLogin, { code }),

  /**
   * 开发登录（后端仅 NODE_ENV!==production 开放；浏览器 H5 无微信运行时时联调用）
   */
  devLogin: (phone: string, name?: string) =>
    http.post<AuthResponse>('/auth/dev-login', { phone, name }),

  /**
   * 绑定微信手机号（getPhoneNumber code）
   */
  bindPhone: (code: string) => http.post<UserInfo>('/auth/wechat/phone', { code }),

  /**
   * 完善个人信息（称呼/手机号），购票时自动填充依赖
   */
  updateProfile: (data: { nickname?: string; phone?: string; avatar?: string }) =>
    http.post<UserInfo>('/auth/me', data),
};
