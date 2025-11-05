import React from 'react';

const Header = ({ currentPage, onNavigate }) => {
  const isMobile = window.innerWidth < 768;
  
  return (
    <header style={{ 
      marginBottom: isMobile ? '1rem' : '2rem', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: isMobile ? '12px 8px' : '0',
      background: isMobile ? 'white' : 'transparent',
      boxShadow: isMobile ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
    }}>
      <h1 style={{ 
        margin: 0, 
        fontSize: isMobile ? '20px' : '28px', 
        fontWeight: '700', 
        color: '#1f2937',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        📅 Althy Calendar
      </h1>
    </header>
  );
};

export default Header;