import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileMenu = ({ currentPage }) => {
  const location = useLocation();
  
  const menuItems = [
    { 
      id: 'althy', 
      label: 'Althy', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ), 
      path: '/app/althy' 
    },
    { 
      id: 'tasks', 
      label: 'Tasks', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ), 
      path: '/app/tasks' 
    },
    { 
      id: 'plan', 
      label: 'Plan', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ), 
      path: '/app/plan' 
    },
    { 
      id: 'goals', 
      label: 'Goals', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ), 
      path: '/app/goals' 
    },
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ), 
      path: '/app/profile' 
    }
  ];

  const isActive = (itemPath) => {
    return location.pathname === itemPath || 
           (itemPath === '/app/plan' && location.pathname === '/app');
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(179, 229, 252, 0.2)',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
      zIndex: 1002,
      justifyContent: 'space-around',
      padding: '12px 8px',
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      width: '100%',
      maxWidth: '380px',
      boxSizing: 'border-box'
    }}>
      {menuItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.id}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flex: 1,
              maxWidth: '100px',
              color: active ? '#14b8a6' : '#6b7280',
              fontWeight: active ? '600' : '400',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.target.style.background = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'inherit'
            }}>
              {item.icon}
            </span>
            <span style={{ fontSize: '10px' }}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default MobileMenu;
