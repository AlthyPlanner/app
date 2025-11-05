import React from 'react';

const MobileMenu = ({ onNavigate, currentPage }) => {
  const isMobile = window.innerWidth < 768;
  
  if (!isMobile) return null;

  const menuItems = [
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'explore', label: 'Explore', icon: '🔍' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      background: 'white',
      borderRadius: '25px',
      padding: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '1px solid #e5e7eb',
      zIndex: 999,
      width: '280px',
      justifyContent: 'space-around'
    }}>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 12px',
            background: currentPage === item.id ? '#f3f4f6' : 'transparent',
            border: 'none',
            borderRadius: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '50px',
            fontSize: '10px',
            color: currentPage === item.id ? '#1f2937' : '#6b7280',
            fontWeight: currentPage === item.id ? '600' : '400'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== item.id) {
              e.target.style.background = '#f9fafb';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== item.id) {
              e.target.style.background = 'transparent';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default MobileMenu;
