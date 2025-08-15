import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService'; 
import { getAuthHeaders } from '../config/api';

function Setup() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [aggregationRange, setAggregationRange] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = AuthService.getToken();
        if (!AuthService.isAuthenticated() || !AuthService.isAdmin() || !token) {
          alert('管理者認証が必要です。');
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:8000/api/admins/me/settings', {
          headers: getAuthHeaders(token)
        });

        if (!response.ok) throw new Error('設定の読み込みに失敗しました。');
        
        const data = await response.json();
        
        setAdminName(data.name);
        setPhoneNumber(data.phone);
        setAggregationRange(String(data.aggregate_range));
        setOriginalSettings(data); 

      } catch (err) {
        console.error("Fetch error:", err);
        alert(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [navigate]);

  const handleSaveSettings = async (event) => {
    event.preventDefault();

    // ★★★ 1. originalSettingsがnullでないことを確認 ★★★
    if (!originalSettings) {
      alert('元の設定データが読み込まれていません。ページを再読み込みしてください。');
      return;
    }

    setIsSaving(true);
    
    const settingsData = { 
      name: adminName,
      phone: phoneNumber, 
      aggregate_range: aggregationRange,
      stock_threshold: originalSettings.stock_threshold, 
      expire_warn_days: originalSettings.expire_warn_days
    };
    
    try {
      const token = AuthService.getToken();
      if (!AuthService.isAuthenticated() || !AuthService.isAdmin() || !token) {
        alert('管理者認証が必要です。');
        navigate('/login');
        return;
      }
      
      const response = await fetch('http://localhost:8000/api/admins/me/settings', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });

      if (!response.ok) {
        throw new Error('設定の保存に失敗しました。入力内容を確認してください。');
      }

      const updatedData = await response.json();
      alert("設定を保存しました。");

      setIsEditing(false);
      setOriginalSettings(updatedData);

    } catch (err) {
      console.error("Save error:", err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (originalSettings) {
      setAdminName(originalSettings.name);
      setPhoneNumber(originalSettings.phone);
      setAggregationRange(String(originalSettings.aggregate_range));
    }
    setIsEditing(false);
  };
  
  const goBack = () => navigate(-1);
  const showMenu = () => alert("メニュー機能は今後実装予定です");

  if (isLoading) {
    return <div style={{padding: '20px', textAlign: 'center'}}>データを読み込み中...</div>;
  }

  return (
    <div>
      <header className="nav-bar">
         <button onClick={goBack} className="nav-back">
           <i className="fas fa-arrow-left"></i>
         </button>
         <span className="nav-title">設定画面</span>
         <button onClick={showMenu} className="nav-menu">
           <i className="fas fa-bars"></i>
         </button>
      </header>
      
      <main className="container">
        <div className="card">
          <div className="card-header">
            <h3>設定画面</h3>
            <p>Settings</p>
          </div>
          <div className="card-content">
            <form className="form" onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label htmlFor="adminName">管理者名</label>
                {isEditing ? (
                  <input id="adminName" type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
                ) : (
                  <p className="info-value">{adminName}</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="phoneNumber">連絡先</label>
                {isEditing ? (
                  <input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                ) : (
                  <p className="info-value">{phoneNumber}</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="aggregationRange">集計範囲（半径km）</label>
                {isEditing ? (
                  <input id="aggregationRange" type="number" value={aggregationRange} onChange={(e) => setAggregationRange(e.target.value)} required />
                ) : (
                  <p className="info-value">{aggregationRange}</p>
                )}
              </div>
              
              {/* 編集中の場合のみフォーム内にボタンを配置 */}
              {isEditing && (
                <div className="action-buttons">
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={isSaving}>
                    キャンセル
                  </button>
                </div>
              )}
            </form>

            {/* 編集ボタンはフォーム外に配置 */}
            {!isEditing && (
              <div className="action-buttons">
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => setIsEditing(true)} 
                  disabled={!originalSettings || isLoading}
                >
                  編集
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Setup;
