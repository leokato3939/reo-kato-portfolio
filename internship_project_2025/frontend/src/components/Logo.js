import React from 'react';

const Logo = ({ 
  size = 'medium', 
  showText = true, 
  variant = 'default',
  className = '',
  style = {}
}) => {
  // Size configurations
  const sizeConfig = {
    small: { img: '24px', icon: '16px', title: '14px', subtitle: '10px' },
    medium: { img: '32px', icon: '20px', title: '16px', subtitle: '12px' },
    large: { img: '80px', icon: '32px', title: '28px', subtitle: '16px' }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  // Variant styles
  const variants = {
    default: { color: '#e60012', bg: '#fff' },
    light: { color: '#fff', bg: 'transparent' },
    dark: { color: '#333', bg: '#fff' }
  };

  const variantStyle = variants[variant] || variants.default;

  return (
    <div 
      className={`logo-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'large' ? '20px' : '12px',
        ...style
      }}
    >
      {/* Logo图片 */}
      <img 
        src="/rakumedilink-logo.webp" 
        alt="RakuMediLink" 
        style={{ 
          width: config.img, 
          height: config.img,
          borderRadius: size === 'large' ? '12px' : '6px',
          boxShadow: variant === 'light' 
            ? '0 2px 8px rgba(255,255,255,0.2)' 
            : '0 2px 8px rgba(0,0,0,0.1)'
        }}
        onError={(e) => {
          // Fallback to FontAwesome icon if image fails to load
          e.target.style.display = 'none';
          e.target.nextElementSibling.style.display = 'flex';
        }}
      />
      
      {/* Fallback icon */}
      <div 
        style={{
          width: config.img,
          height: config.img,
          backgroundColor: variantStyle.color,
          borderRadius: size === 'large' ? '12px' : '6px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: variant === 'light' 
            ? '0 2px 8px rgba(255,255,255,0.2)' 
            : '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <i 
          className="fas fa-pills" 
          style={{ 
            fontSize: config.icon, 
            color: variant === 'default' ? '#fff' : variantStyle.color
          }}
        ></i>
      </div>

      {/* Text */}
      {showText && (
        <div>
          <div style={{ 
            margin: 0, 
            fontSize: config.title, 
            fontWeight: '600', 
            color: variantStyle.color,
            lineHeight: '1.2'
          }}>
            RakuMediLink
          </div>
          {size === 'large' && (
            <>
              <div style={{ 
                margin: '4px 0 0 0', 
                fontSize: config.subtitle, 
                color: variantStyle.color === '#fff' ? 'rgba(255,255,255,0.8)' : '#666',
                fontWeight: '500'
              }}>
                医薬品在庫管理システム
              </div>
              <div style={{ 
                margin: '2px 0 0 0', 
                fontSize: '12px', 
                color: variantStyle.color === '#fff' ? 'rgba(255,255,255,0.6)' : '#999',
                fontStyle: 'italic'
              }}>
                Medication Inventory Management System
              </div>
            </>
          )}
          {size === 'medium' && (
            <div style={{
              fontSize: config.subtitle,
              opacity: 0.8,
              fontWeight: '400',
              color: variantStyle.color === '#fff' ? 'rgba(255,255,255,0.8)' : '#666'
            }}>
              {variant === 'light' ? 'RakuMediLink' : '医薬品在庫管理'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo; 