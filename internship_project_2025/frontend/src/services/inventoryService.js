import { API_ENDPOINTS, HTTP_METHODS, getAuthHeaders } from '../config/api';
import AuthService from './authService';

class InventoryService {
  // 获取当前管理员所属避难所的库存信息（使用 /api/admins/my-shelter/inventory）
  // API返回格式: [{ "shelter_name": "string", "medication_name": "string", "quantity": 0, "expiry_date": "2025-08-07", "description": "string", "required_quantity": 0 }]
  static async getMyShelterInventory() {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('認証トークンがありません');
      }

      console.log('🔍 调用 /api/admins/my-shelter/inventory API...');
      console.log('🔗 API URL:', API_ENDPOINTS.admins.myShelterInventory);
      
      const response = await fetch(API_ENDPOINTS.admins.myShelterInventory, {
        method: HTTP_METHODS.GET,
        headers: getAuthHeaders(token),
      });

      console.log('📡 API 响应状态:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          throw new Error('認証が無効です。再度ログインしてください。');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error ${response.status}: 避難所在庫情報の取得に失敗しました`);
      }

      const data = await response.json();
      console.log('✅ My Shelter API 返回原始数据:', data);

      // 确保返回的是数组
      if (!Array.isArray(data)) {
        console.warn('❌ My Shelter API返回的数据不是数组格式:', data);
        throw new Error('APIから無効なデータ形式が返されました');
      }

      // 验证和标准化数据，确保required_quantity字段存在
      const normalizedData = data.map(item => {
        // 检查required_quantity字段
        if (!item.hasOwnProperty('required_quantity')) {
          console.warn('⚠️ API返回的数据缺少required_quantity字段:', item);
        }
        
        return {
          shelter_name: item.shelter_name || '',
          medication_name: item.medication_name || '',
          quantity: Number(item.quantity) || 0,
          required_quantity: Number(item.required_quantity) || 0, // 确保required_quantity存在
          expiry_date: item.expiry_date || null,
          description: item.description || ''
        };
      });

      console.log('📊 My Shelter API 标准化后数据:', normalizedData);
      console.log('🔢 字段验证结果:', 
        normalizedData.map(item => ({
          medication: item.medication_name,
          quantity: item.quantity,
          required_quantity: item.required_quantity, // 显示required_quantity
          expiry_date: item.expiry_date
        }))
      );

      return normalizedData;
    } catch (error) {
      console.error('❌ Get my shelter inventory error:', error);
      throw error;
    }
  }

  // 获取所有避难所的库存信息（管理员权限）
  static async getAllInventory() {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('認証トークンがありません');
      }

      const response = await fetch(API_ENDPOINTS.admins.inventory, {
        method: HTTP_METHODS.GET,
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          throw new Error('認証が無効です。再度ログインしてください。');
        }
        const data = await response.json();
        throw new Error(data.detail || '在庫情報の取得に失敗しました');
      }

      const data = await response.json();
      // 确保返回的是数组并包含required_quantity字段
      if (!Array.isArray(data)) {
        console.warn('API返回的数据不是数组格式:', data);
        return [];
      }

      const normalizedData = data.map(item => ({
        ...item,
        required_quantity: Number(item.required_quantity) || 0
      }));

      console.log('All Inventory API返回数据:', normalizedData);
      return normalizedData;
    } catch (error) {
      console.error('Get all inventory error:', error);
      throw error;
    }
  }

  // 更新药品库存（使用/api/admins/my-shelter/inventory API）
  // 注意：只允许修改 quantity，required_quantity 不能编辑
  static async updateMedicationInventory(medicationName, inventoryData) {
    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('認証トークンがありません');
      }

      // 只发送quantity和description字段，required_quantity由后端管理，不可编辑
      const updateData = {
        quantity: Number(inventoryData.quantity) || 0,
        description: inventoryData.description || ''
        // 注意：不包含required_quantity，该字段由后端控制，前端不可编辑
      };

      console.log('📝 更新リクエスト詳細:');
      console.log('- 薬品名:', medicationName);
      console.log('- 更新データ (quantity可编辑):', updateData);
      console.log('- API URL:', API_ENDPOINTS.admins.updateInventory(medicationName));
      console.log('- トークン (最初の20文字):', token.substring(0, 20) + '...');
      console.log('- ユーザータイプ:', AuthService.getUserType());
      console.log('⚠️ required_quantity字段不包含在更新中 (后端管理)');

      const requestUrl = API_ENDPOINTS.admins.updateInventory(medicationName);
      console.log('完整的请求URL:', requestUrl);

      const response = await fetch(requestUrl, {
        method: HTTP_METHODS.PUT,
        headers: getAuthHeaders(token),
        body: JSON.stringify(updateData),
      });

      console.log('📡 更新レスポンス状態:', response.status);
      console.log('📡 更新レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const responseText = await response.text();
        console.log('❌ エラーレスポンス本文:', responseText);

        if (response.status === 401) {
          AuthService.logout();
          throw new Error('認証が無効です。再度ログインしてください。');
        }
        if (response.status === 403) {
          throw new Error('この操作を実行する権限がありません。管理者権限が必要です。');
        }
        if (response.status === 404) {
          throw new Error('薬品が見つかりません。または、APIエンドポイントが存在しません。');
        }

        try {
          const data = JSON.parse(responseText);
          throw new Error(data.detail || data.message || '在庫更新に失敗しました');
        } catch (parseError) {
          throw new Error(`HTTP Error ${response.status}: ${responseText}`);
        }
      }

      const data = await response.json();
      console.log('✅ 更新成功レスポンス:', data);
      return data;
    } catch (error) {
      console.error('❌ Update medication inventory error:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 根据实际API返回的数据格式进行库存状态分类
  static categorizeInventoryByQuantity(inventoryList, thresholds = { warning: 3, shortage: 1 }) {
    const categorized = {
      sufficient: [],
      warning: [],
      shortage: []
    };

    if (!Array.isArray(inventoryList)) {
      console.warn('categorizeInventoryByQuantity: 输入不是数组');
      return categorized;
    }

    inventoryList.forEach(item => {
      const quantity = Number(item.quantity) || 0;
      if (quantity === 0) {
        categorized.shortage.push(item);
      } else if (quantity < thresholds.warning) {
        categorized.warning.push(item);
      } else {
        categorized.sufficient.push(item);
      }
    });

    return categorized;
  }

  // 基于 required_quantity 的库存状态分类（新增）
  static categorizeInventoryByRequiredQuantity(inventoryList) {
    const categorized = {
      sufficient: [],    // quantity >= required_quantity
      insufficient: [],  // quantity < required_quantity
      shortage: []       // quantity = 0
    };

    if (!Array.isArray(inventoryList)) {
      console.warn('categorizeInventoryByRequiredQuantity: 输入不是数组');
      return categorized;
    }

    inventoryList.forEach(item => {
      const quantity = Number(item.quantity) || 0;
      const requiredQuantity = Number(item.required_quantity) || 0;
      
      if (quantity === 0) {
        categorized.shortage.push(item);
      } else if (quantity < requiredQuantity) {
        categorized.insufficient.push(item);
      } else {
        categorized.sufficient.push(item);
      }
    });

    return categorized;
  }

  // 根据药品名称查找有库存的避难所
  static findSheltersWithMedication(inventoryList, medicationName, minQuantity = 1) {
    if (!Array.isArray(inventoryList)) {
      return [];
    }

    return inventoryList
      .filter(item => 
        item.medication_name === medicationName && 
        Number(item.quantity) >= minQuantity
      )
      .sort((a, b) => Number(b.quantity) - Number(a.quantity)) // 按库存量降序排列
      .map(item => ({
        shelterName: item.shelter_name,
        medicationName: item.medication_name,
        quantity: Number(item.quantity),
        required_quantity: Number(item.required_quantity) || 0, // 添加required_quantity字段
        expiryDate: item.expiry_date,
        description: item.description
      }));
  }

  // 获取库存统计信息（基于实际数据结构）
  static getInventoryStatistics(inventoryList, thresholds = { warning: 3, shortage: 1 }) {
    if (!Array.isArray(inventoryList)) {
      return {
        total: 0,
        sufficient: 0,
        warning: 0,
        shortage: 0,
        categories: { sufficient: [], warning: [], shortage: [] }
      };
    }

    const categorized = this.categorizeInventoryByQuantity(inventoryList, thresholds);
    return {
      total: inventoryList.length,
      sufficient: categorized.sufficient.length,
      warning: categorized.warning.length,
      shortage: categorized.shortage.length,
      categories: categorized
    };
  }

  // 获取避难所列表（基于实际API数据格式）
  static getShelterList(inventoryList) {
    if (!Array.isArray(inventoryList)) {
      return [];
    }

    const shelterMap = new Map();
    inventoryList.forEach(item => {
      if (!item.shelter_name) return;
      if (!shelterMap.has(item.shelter_name)) {
        shelterMap.set(item.shelter_name, {
          shelterName: item.shelter_name,
          medicationCount: 1,
          totalQuantity: Number(item.quantity) || 0,
          totalRequiredQuantity: Number(item.required_quantity) || 0, // 添加required_quantity统计
          medications: [item]
        });
      } else {
        const shelter = shelterMap.get(item.shelter_name);
        shelter.medicationCount++;
        shelter.totalQuantity += Number(item.quantity) || 0;
        shelter.totalRequiredQuantity += Number(item.required_quantity) || 0; // 累加required_quantity
        shelter.medications.push(item);
      }
    });

    return Array.from(shelterMap.values());
  }

  // 根据避难所名称获取该避难所的库存
  static getShelterInventoryByName(inventoryList, shelterName) {
    if (!Array.isArray(inventoryList) || !shelterName) {
      return [];
    }

    return inventoryList.filter(item => item.shelter_name === shelterName);
  }

  // 检查药品是否即将过期（30天内）
  static checkExpiryStatus(expiryDate) {
    if (!expiryDate) {
      return { status: 'unknown', daysLeft: null, color: '#6c757d' };
    }

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { status: 'expired', daysLeft, color: '#dc3545' };
    } else if (daysLeft <= 7) {
      return { status: 'critical', daysLeft, color: '#dc3545' };
    } else if (daysLeft <= 30) {
      return { status: 'warning', daysLeft, color: '#ffc107' };
    } else {
      return { status: 'good', daysLeft, color: '#28a745' };
    }
  }

  // 获取即将过期的药品列表
  static getExpiringMedications(inventoryList, warningDays = 30) {
    if (!Array.isArray(inventoryList)) {
      return [];
    }

    return inventoryList
    .map(item => ({
      ...item,
      expiryStatus: this.checkExpiryStatus(item.expiry_date)
    }))
    .filter(item => 
    item.expiryStatus.status === 'critical' || 
    item.expiryStatus.status === 'warning' || 
    item.expiryStatus.status === 'expired'
    )
    .sort((a, b) => a.expiryStatus.daysLeft - b.expiryStatus.daysLeft);
  }

  // 数据验证工具
  static validateInventoryItem(item) {
    return item && 
           typeof item.shelter_name === 'string' &&
           typeof item.medication_name === 'string' &&
           typeof item.quantity !== 'undefined' &&
           typeof item.required_quantity !== 'undefined';
  }

  // 清理和标准化库存数据
  static normalizeInventoryData(inventoryList) {
    if (!Array.isArray(inventoryList)) {
      console.warn('normalizeInventoryData: 输入不是数组');
      return [];
    }

    return inventoryList
      .filter(item => this.validateInventoryItem(item))
      .map(item => ({
        shelter_name: item.shelter_name || '',
        medication_name: item.medication_name || '',
        quantity: Number(item.quantity) || 0,
        required_quantity: Number(item.required_quantity) || 0, // 添加required_quantity字段
        expiry_date: item.expiry_date || null,
        description: item.description || ''
      }));
  }
}

export default InventoryService;