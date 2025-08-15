import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';

// ログイン画面コンポーネント
const Login = () => {
  const navigate = useNavigate();
  // フォームデータの状態管理
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  // ローディング状態管理
  const [isLoading, setIsLoading] = useState(false);
  // エラーメッセージの状態管理
  const [errorMessage, setErrorMessage] = useState('');

  // 入力変更時の処理
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // エラーメッセージをクリア
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  // フォーム送信時の処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // メールアドレスとパスワードの入力チェック
    if (!formData.email || !formData.password) {
      setErrorMessage('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log('ログイン試行中:', formData.email);
      
      // ユーザーAPIでログインを試行
      try {
        console.log('ユーザーAPIでログインを試みます...');
        const userResult = await AuthService.loginUser(formData.email, formData.password);
        console.log('ユーザーログイン成功:', userResult);
        
        // ユーザー詳細情報の取得
        try {
          await AuthService.getCurrentUser();
        } catch (userInfoError) {
          console.warn('ユーザー情報の取得に失敗しましたが、ログインは成功しました:', userInfoError);
        }
        
        alert('ログインに成功しました');
        navigate('/mypage');
        return;
      } catch (userError) {
        console.log('ユーザーAPIでのログインに失敗、管理者APIで試行中:', userError.message);
        
        // 管理者APIでログインを試行
        try {
          console.log('管理者APIでログインを試みます...');
          const adminResult = await AuthService.loginAdmin(formData.email, formData.password);
          console.log('管理者ログイン成功:', adminResult);
          
          alert('ログインに成功しました');
          navigate('/admin-dashboard');
          return;
        } catch (adminError) {
          console.log('管理者APIでのログインにも失敗:', adminError.message);
          
          // エラー内容に応じてメッセージを設定
          if (adminError.message.includes('401') || adminError.message.includes('Unauthorized')) {
            setErrorMessage('メールアドレスまたはパスワードが正しくありません');
          } else if (adminError.message.includes('500') || adminError.message.includes('Internal Server Error')) {
            setErrorMessage('サーバーエラーが発生しました。しばらくしてから再試行してください');
          } else {
            setErrorMessage(adminError.message || 'ログインに失敗しました。資格情報をご確認ください');
          }
        }
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      setErrorMessage(error.message || 'ログイン中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // パスワードを忘れた場合の処理
  const handleForgotPassword = () => {
    alert('パスワードリセット機能は近日公開予定です。システム管理者にご連絡ください。');
  };

  // ページレンダリング
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '10px',
      paddingTop: '5vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
    }}>
      {/* Main container */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        border: '1px solid rgba(230, 0, 18, 0.1)'
      }}>
        {/* Header section with logo */}
        <div style={{ 
          background: 'linear-gradient(135deg, #e60012 0%, #cc0010 100%)',
          padding: '24px 16px',
          textAlign: 'center',
          color: 'white',
          position: 'relative'
        }}>
          {/* Background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px), radial-gradient(circle at 80% 50%, white 2px, transparent 2px)',
            backgroundSize: '40px 40px'
          }}></div>
          
          <div style={{
            position: 'relative',
            zIndex: 1
          }}>
            {/* Logo container */}
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              <img 
                src="/rakumedilink-logo.webp" 
                alt="RakuMediLink" 
                style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '6px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              {/* Fallback icon */}
              <div style={{
                width: '36px',
                height: '36px',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-pills" style={{ fontSize: '20px', color: 'white' }}></i>
              </div>
            </div>

            <h1 style={{ 
              margin: '0 0 6px 0', 
              fontSize: '24px', 
              fontWeight: '700',
              letterSpacing: '-0.3px'
            }}>
              RakuMediLink
            </h1>
            <p style={{ 
              margin: '0 0 2px 0', 
              fontSize: '14px',
              fontWeight: '500',
              opacity: 0.9
            }}>
              医薬品在庫管理システム
            </p>
          </div>
        </div>

        {/* Form section */}
        <div style={{ padding: '24px 20px' }}>
          <div style={{ 
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              <i className="fas fa-sign-in-alt" style={{ marginRight: '6px', color: '#e60012' }}></i> 
              ログイン画面
            </h3>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#495057'
              }}>
                <i className="fas fa-envelope" style={{ marginRight: '6px', color: '#e60012' }}></i> 
                メールアドレス
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="メールアドレスを入力してください"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease',
                    backgroundColor: isLoading ? '#f8f9fa' : '#ffffff',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#e60012'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#495057'
              }}>
                <i className="fas fa-lock" style={{ marginRight: '6px', color: '#e60012' }}></i> 
                パスワード
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="パスワードを入力してください"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease',
                    backgroundColor: isLoading ? '#f8f9fa' : '#ffffff',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#e60012'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              </div>
            </div>

            {/* Forgot password link */}
            <div style={{ 
              textAlign: 'right', 
              marginBottom: '18px'
            }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e60012',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  padding: '2px 0',
                  transition: 'opacity 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
                <i className="fas fa-question-circle" style={{ marginRight: '4px' }}></i> 
                パスワードを忘れた？
              </button>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div style={{
                color: '#e60012',
                backgroundColor: '#fff5f5',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '13px',
                border: '1px solid #fed7d7',
                display: 'flex',
                alignItems: 'center'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ 
                  marginRight: '6px',
                  fontSize: '14px',
                  flexShrink: 0
                }}></i>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit button */}
            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: isLoading ? '#cccccc' : '#e60012',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isLoading ? 'none' : '0 4px 12px rgba(230, 0, 18, 0.3)',
                transform: 'translateY(0)',
                outline: 'none'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = '#cc0010';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(230, 0, 18, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.target.style.backgroundColor = '#e60012';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(230, 0, 18, 0.3)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                  ログイン中...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt" style={{ marginRight: '6px' }}></i>
                  ログイン
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e9ecef'
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            color: '#6c757d'
          }}>
            © 2025 RakuMediLink. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;