import React from 'react';
import ReactDOM from 'react-dom/client';
import Header from './components/Header';
import TodoList from './components/TodoList';
import OpenAIChat from './components/OpenAIChat';
import TypeManager from './components/TypeManager';
import CalendarPage from './components/CalendarPage';
import MobileMenu from './components/MobileMenu';
import { useState } from 'react';

const App = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [showAIModal, setShowAIModal] = useState(false);

  const handleNavigate = (newTab) => {
    if (newTab === 'ai') {
      setShowAIModal(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{ 
      maxWidth: '100vw', 
      margin: '0', 
      fontFamily: 'sans-serif',
      minHeight: '100vh',
      background: '#f9f9f9'
    }}>
      <Header currentPage={activeTab} onNavigate={handleNavigate} />
      
      {/* Main Content Area */}
      <div style={{ 
        background: '#f9f9f9', 
        padding: window.innerWidth < 768 ? '8px' : '16px', 
        borderRadius: window.innerWidth < 768 ? '0' : '8px',
        minHeight: 'calc(100vh - 80px)',
        paddingBottom: window.innerWidth < 768 ? '120px' : '16px'
      }}>
        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          marginBottom: window.innerWidth < 768 ? '12px' : '20px', 
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: window.innerWidth < 768 ? '6px' : '8px',
          background: 'white',
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden'
        }}>
          <button 
            onClick={() => setActiveTab('calendar')} 
            style={{
              flex: 1,
              padding: window.innerWidth < 768 ? '12px 8px' : '16px 20px', 
              borderRadius: 0, 
              border: 'none',
              background: activeTab === 'calendar' ? '#1976d2' : '#f8f9fa',
              color: activeTab === 'calendar' ? 'white' : '#6b7280',
              fontWeight: activeTab === 'calendar' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: window.innerWidth < 768 ? '14px' : '16px',
              textAlign: 'center',
              borderRight: '1px solid #e5e7eb'
            }}
          >
            Calendar
          </button>
          <button 
            onClick={() => setActiveTab('todos')} 
            style={{
              flex: 1,
              padding: window.innerWidth < 768 ? '12px 8px' : '16px 20px', 
              borderRadius: 0, 
              border: 'none',
              background: activeTab === 'todos' ? '#1976d2' : '#f8f9fa',
              color: activeTab === 'todos' ? 'white' : '#6b7280',
              fontWeight: activeTab === 'todos' ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: window.innerWidth < 768 ? '14px' : '16px',
              textAlign: 'center'
            }}
          >
            Todos
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'calendar' ? (
          <CalendarPage />
        ) : (
          <div style={{ 
            display: 'flex', 
            gap: window.innerWidth < 768 ? '1rem' : '2rem',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row'
          }}>
            {/* Left Column - Type Manager */}
            <div style={{ 
              flex: window.innerWidth < 768 ? 'none' : '0 0 20%',
              order: window.innerWidth < 768 ? 2 : 1
            }}>
              <TypeManager />
            </div>
            
            {/* Right Column - Todo List */}
            <div style={{ 
              flex: 1,
              order: window.innerWidth < 768 ? 1 : 2
            }}>
              <TodoList />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      <MobileMenu onNavigate={handleNavigate} currentPage={activeTab} />

      {/* Floating AI Conversation Button */}
      <button
        onClick={() => setShowAIModal(true)}
        style={{
          position: 'fixed',
          bottom: isMobile ? '90px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#4CAF50',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateX(-50%) scale(1.1)';
          e.target.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateX(-50%) scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
        }}
      >
        💬
      </button>

      {/* AI Assistant Modal */}
      {showAIModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.6)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{ 
            background: 'white', 
            borderRadius: 16, 
            width: '100%', 
            maxWidth: 900, 
            height: '100%', 
            maxHeight: 700,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '20px 24px', 
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
              borderRadius: '16px 16px 0 0'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>🤖 AI Assistant</h2>
              <button 
                onClick={() => setShowAIModal(false)} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  fontSize: '28px', 
                  cursor: 'pointer', 
                  color: '#6b7280',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>
            <div style={{ 
              flex: 1, 
              overflow: 'hidden',
              padding: '24px',
              background: '#fafafa'
            }}>
              <OpenAIChat />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
