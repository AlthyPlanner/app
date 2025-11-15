import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TodoList from '../features/TodoList';
import QuickNotes from '../features/QuickNotes';
import TaskModal from '../modals/TaskModal';

const TasksPage = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState('today'); // 'today', 'thisWeek', or 'all'
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'thisWeek'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset date filter when switching view modes
  useEffect(() => {
    if (viewMode === 'today' && dateFilter === 'thisWeek') {
      setDateFilter('today');
    } else if (viewMode === 'thisWeek' && dateFilter === 'today') {
      setDateFilter('thisWeek');
    }
  }, [viewMode]);


  const getFormattedDate = () => {
    const today = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  const getNotesDate = () => {
    // Return date/week identifier for notes
    // For "Today" view, show today's notes
    // For "This week" view, show week notes (using week start date)
    // For "All" view, return null to hide notes
    if (viewMode === 'all') {
      return null;
    }
    if (viewMode === 'today') {
      const today = new Date();
      return { type: 'day', date: today.toISOString().split('T')[0] };
    }
    if (viewMode === 'thisWeek') {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Get Sunday of the week
      return { type: 'week', date: weekStart.toISOString().split('T')[0] };
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100%',
      maxWidth: '100%',
      paddingBottom: '200px',
      background: 'white',
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? '20px 16px 16px' : '24px 24px 20px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: '700',
              color: '#1f2937',
              lineHeight: '1.2',
              marginBottom: '4px'
            }}>
              Take it one task at a time
            </h1>
            <p style={{
              margin: 0,
              fontSize: isMobile ? '14px' : '16px',
              color: '#6b7280',
              fontWeight: '400'
            }}>
              {getFormattedDate()}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
        </div>

        {/* Filter Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '20px'
        }}>
          {/* View Selector - Segmented Control */}
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            borderRadius: '10px',
            padding: '4px',
            gap: '4px',
            width: '100%'
          }}>
            <button
              onClick={() => {
                setViewMode('today');
                setDateFilter('today');
              }}
              style={{
                flex: 1,
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'today' ? 'white' : 'transparent',
                color: viewMode === 'today' ? '#1f2937' : '#6b7280',
                fontSize: '14px',
                fontWeight: viewMode === 'today' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'today' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              Today
            </button>
            <button
              onClick={() => {
                setViewMode('thisWeek');
                setDateFilter('thisWeek');
              }}
              style={{
                flex: 1,
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'thisWeek' ? 'white' : 'transparent',
                color: viewMode === 'thisWeek' ? '#1f2937' : '#6b7280',
                fontSize: '14px',
                fontWeight: viewMode === 'thisWeek' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'thisWeek' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              This week
            </button>
            <button
              onClick={() => {
                setViewMode('all');
              }}
              style={{
                flex: 1,
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'all' ? 'white' : 'transparent',
                color: viewMode === 'all' ? '#1f2937' : '#6b7280',
                fontSize: '14px',
                fontWeight: viewMode === 'all' ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: viewMode === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              All
            </button>
          </div>

        </div>
      </div>

      {/* Task List */}
      <div style={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        flex: 1
      }}>
        <TodoList 
          viewMode={viewMode}
          dateFilter={dateFilter}
        />
      </div>

      {/* Quick Notes - Connected to menu (only show for Today and This week views) */}
      {viewMode !== 'all' && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '80px' : '80px',
          left: 0,
          right: 0,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: isMobile ? '16px' : '24px',
          paddingBottom: isMobile ? '16px' : '24px',
          background: 'white',
          borderTop: '1px solid #e5e7eb',
          zIndex: 100
        }}>
          <QuickNotes date={getNotesDate()} />
        </div>
      )}

      {/* Floating Action Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          style={{
            position: 'fixed',
            bottom: isMobile ? '100px' : '120px',
            right: isMobile ? '20px' : '40px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#374151',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
        >
          +
        </button>

        {/* Add Menu Dropdown */}
        {showAddMenu && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'transparent'
              }}
              onClick={() => setShowAddMenu(false)}
            />
            <div
              style={{
                position: 'fixed',
                bottom: isMobile ? '170px' : '190px',
                right: isMobile ? '20px' : '40px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1002,
                minWidth: '200px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb'
              }}
            >
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setShowTaskModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add manually
              </button>
              <div style={{
                height: '1px',
                background: '#e5e7eb'
              }} />
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  navigate('/app/althy');
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Let Althy help you
              </button>
            </div>
          </>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          onClose={() => setShowTaskModal(false)}
          onSave={() => {
            setShowTaskModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default TasksPage;
