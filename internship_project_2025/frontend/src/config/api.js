// API配置文件 - Team5 Inventory App
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

// API端点 - 根据新的项目结构
export const API_ENDPOINTS = {
  // 用户相关 - /api/users
  users: {
    login: `${API_BASE_URL}/users/login`,
    me: `${API_BASE_URL}/users/me`,
    qr: (userId) => `${API_BASE_URL}/users/qr/${userId}`,
    qrImage: (userId) => `${API_BASE_URL}/users/qr-image/${userId}`,
  },
  
  // 管理员相关 - /api/admins
  admins: {
    login: `${API_BASE_URL}/admins/login`,
    me: `${API_BASE_URL}/admins/me`,
    inventory: `${API_BASE_URL}/admins/inventory`,
    myShelterInventory: `${API_BASE_URL}/admins/my-shelter/inventory`,
    updateInventory: (medicationName) => `${API_BASE_URL}/admins/inventory/${medicationName}`,
  },
  
  // 避难所库存管理 - /api/shelters
  shelters: {
    inventory: (shelterId) => `${API_BASE_URL}/shelters/${shelterId}/inventory`,
    updateInventory: (shelterId, medicationName) => 
      `${API_BASE_URL}/shelters/${shelterId}/inventory/${medicationName}`,
  },
  
  // 库存查询 - /api/inventory
  inventory: {
    all: `${API_BASE_URL}/inventory`,
    shelter: (shelterId) => `${API_BASE_URL}/inventory/shelter/${shelterId}`,
  },
};

// HTTP方法常量
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
};

// 默认请求配置
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// 认证头部
export const getAuthHeaders = (token) => ({
  ...DEFAULT_HEADERS,
  'Authorization': `Bearer ${token}`,
});

export default API_BASE_URL; 