import React from 'react';

const Header = ({ currentPage, onNavigate }) => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: isMobile ? '12px 0' : '16px 0',
      background: 'transparent',
      borderBottom: '1px solid rgba(179, 229, 252, 0.2)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      width: '100%',
      maxWidth: '380px',
      boxSizing: 'border-box',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)'
    }}>
      <img 
        src="/img/Logo.png" 
        alt="Althy Planner" 
        style={{ 
          height: isMobile ? '44px' : '52px',
          width: 'auto',
          objectFit: 'contain'
        }}
      />
    </header>
  );
};

export default Header;