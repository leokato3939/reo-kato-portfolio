import { API_ENDPOINTS, HTTP_METHODS, DEFAULT_HEADERS, getAuthHeaders } from '../config/api';

class AuthService {
  // 本地存储的键名
  static TOKEN_KEY = 'access_token';
  static USER_TYPE_KEY = 'user_type';
  static USER_INFO_KEY = 'user_info';

  // 用户登录 - /api/users/login
  static async loginUser(email, password) {
    try {
      const response = await fetch(API_ENDPOINTS.users.login, {
        method: HTTP_METHODS.POST,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'ログインに失敗しました');
      }

      // 保存token和用户类型
      this.setToken(data.access_token);
      this.setUserType('user');
      
      // 立即获取用户信息
      try {
        const userInfo = await this.getCurrentUser();
        this.setUserInfo(userInfo);
      } catch (error) {
        console.warn('用户信息获取失败，但登录成功:', error);
      }

      return data;
    } catch (error) {
      console.error('User login error:', error);
      throw error;
    }
  }

  // 管理员登录 - /api/admins/login
  static async loginAdmin(email, password) {
    try {
      const response = await fetch(API_ENDPOINTS.admins.login, {
        method: HTTP_METHODS.POST,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || '管理者ログインに失敗しました');
      }

      // 保存token和用户类型
      this.setToken(data.access_token);
      this.setUserType('admin');

      // 管理员登录后也尝试获取用户信息
      try {
        const adminInfo = await this.getCurrentAdmin();
        this.setUserInfo(adminInfo);
      } catch (error) {
        console.warn('管理员信息获取失败，但登录成功:', error);
      }

      return data;
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }

  // 获取当前用户信息 - /api/users/me
  static async getCurrentUser() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch(API_ENDPOINTS.users.me, {
        method: HTTP_METHODS.GET,
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token过期或无效，清除本地存储
          this.logout();
          throw new Error('認証が無効です。再度ログインしてください。');
        }
        const data = await response.json();
        throw new Error(data.detail || 'ユーザー情報の取得に失敗しました');
      }

      const data = await response.json();
      this.setUserInfo(data);
      return data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  // 获取医疗信息用于QR码 - /api/users/qr/{user_id}
  static async getMedicalInfoForQR(userId) {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch(API_ENDPOINTS.users.qr(userId), {
        method: HTTP_METHODS.GET,
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          throw new Error('認証が無効です。再度ログインしてください。');
        }
        const data = await response.json();
        throw new Error(data.detail || '医療情報の取得に失敗しました');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get medical info error:', error);
      throw error;
    }
  }

  // 获取QR码图片
  static async getQRCodeImage(userId) {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(API_ENDPOINTS.users.qrImage(userId), {
        method: HTTP_METHODS.GET,
        headers: getAuthHeaders(token),
      });

      console.log('QR Image API Response Status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          throw new Error('認証が無効です。再度ログインしてください。');
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP Error ${response.status}`);
        } else {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }
      }

      const blob = await response.blob();
      console.log('QR Image Blob Type:', blob.type);
      console.log('QR Image Blob Size:', blob.size);
      
      return blob;
    } catch (error) {
      console.error('QR码图片获取失败:', error);
      throw error;
    }
  }

  // Token管理
  static setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // 用户类型管理
  static setUserType(userType) {
    localStorage.setItem(this.USER_TYPE_KEY, userType);
  }

  static getUserType() {
    return localStorage.getItem(this.USER_TYPE_KEY);
  }

  static removeUserType() {
    localStorage.removeItem(this.USER_TYPE_KEY);
  }

  // 用户信息管理
  static setUserInfo(userInfo) {
    localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
  }

  static getUserInfo() {
    const userInfo = localStorage.getItem(this.USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  static removeUserInfo() {
    localStorage.removeItem(this.USER_INFO_KEY);
  }

  // 认证状态检查
  static isAuthenticated() {
    return !!this.getToken();
  }

  static isUser() {
    return this.getUserType() === 'user';
  }

  static isAdmin() {
    return this.getUserType() === 'admin';
  }

  // 登出
  static logout() {
    this.removeToken();
    this.removeUserType();
    this.removeUserInfo();
  }

  // 检查token是否有效（可选的验证方法）
  static async validateToken() {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  // 获取当前管理员信息 - /api/admins/me
  static async getCurrentAdmin() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch(API_ENDPOINTS.admins.me, {
        method: HTTP_METHODS.GET,
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token过期或无效，清除本地存储
          this.logout();
          throw new Error('認証が無効です。再度ログインしてください。');
        }
        const data = await response.json();
        throw new Error(data.detail || '管理者情報の取得に失敗しました');
      }

      const data = await response.json();
      this.setUserInfo(data);
      return data;
    } catch (error) {
      console.error('Get current admin error:', error);
      throw error;
    }
  }
}

export default AuthService;