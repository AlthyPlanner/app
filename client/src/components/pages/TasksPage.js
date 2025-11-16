import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TodoList from '../features/TodoList';
import QuickNotes from '../features/QuickNotes';
import TaskModal from '../modals/TaskModal';
import { getCombinedHistory, formatHistoryDate, formatHistoryTime } from '../../utils/taskHistory';
import './TasksPage.css';

const TasksPage = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState('today'); // 'today', 'thisWeek', or 'all'
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'thisWeek'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);

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

  // Load history when showing history panel
  useEffect(() => {
    if (showHistory) {
      const history = getCombinedHistory();
      setHistoryData(history);
    }
  }, [showHistory]);

  // Close history when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHistory && !event.target.closest('[data-history-panel]') && !event.target.closest('[data-history-button]')) {
        setShowHistory(false);
      }
    };
    
    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHistory]);


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
    <div className="tasks-page">
      {/* Header */}
      <div className={`tasks-header ${!isMobile ? 'tasks-header-desktop' : ''}`}>
        <div className="tasks-header-top">
          <div>
            <h1 className={`tasks-title ${!isMobile ? 'tasks-title-desktop' : ''}`}>
              Take it one task at a time
            </h1>
            <p className={`tasks-date ${!isMobile ? 'tasks-date-desktop' : ''}`}>
              {getFormattedDate()}
            </p>
          </div>
          <button
            data-history-button
            onClick={() => setShowHistory(!showHistory)}
            title="Task & Note History"
            className={`history-button ${showHistory ? 'history-button-active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>
        </div>

        {/* Filter Section */}
        <div className="filter-section">
          {/* View Selector - Segmented Control */}
          <div className="view-selector">
            <button
              onClick={() => {
                setViewMode('today');
                setDateFilter('today');
              }}
              className={`view-button ${viewMode === 'today' ? 'view-button-active' : ''}`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setViewMode('thisWeek');
                setDateFilter('thisWeek');
              }}
              className={`view-button ${viewMode === 'thisWeek' ? 'view-button-active' : ''}`}
            >
              This week
            </button>
            <button
              onClick={() => {
                setViewMode('all');
              }}
              className={`view-button ${viewMode === 'all' ? 'view-button-active' : ''}`}
            >
              All
            </button>
          </div>

        </div>
      </div>

      {/* Task List */}
      <div className={`task-list-container ${!isMobile ? 'task-list-container-desktop' : ''}`}>
        <TodoList 
          viewMode={viewMode}
          dateFilter={dateFilter}
        />
      </div>

      {/* Quick Notes - Connected to menu (only show for Today and This week views) */}
      {viewMode !== 'all' && (
        <div className={`quick-notes-container ${!isMobile ? 'quick-notes-container-desktop' : ''}`}>
          <QuickNotes date={getNotesDate()} />
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fab-container">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className={`fab-button ${!isMobile ? 'fab-button-desktop' : ''}`}
        >
          +
        </button>

        {/* Add Menu Dropdown */}
        {showAddMenu && (
          <>
            <div
              className="add-menu-overlay"
              onClick={() => setShowAddMenu(false)}
            />
            <div className={`add-menu-dropdown ${!isMobile ? 'add-menu-dropdown-desktop' : ''}`}>
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setShowTaskModal(true);
                }}
                className="add-menu-item"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add manually
              </button>
              <div className="add-menu-divider" />
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  navigate('/app/althy');
                }}
                className="add-menu-item"
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

      {/* History Panel */}
      {showHistory && (
        <div 
          data-history-panel
          className={`history-panel ${!isMobile ? 'history-panel-desktop' : ''}`}
        >
          <div className="history-panel-header">
            <h3 className="history-panel-title">
              Task & Note History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="history-panel-close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div className="history-panel-content">
            {historyData.length === 0 ? (
              <div className="history-empty">
                <p className="history-empty-text">
                  No history yet. Your tasks and notes will appear here.
                </p>
              </div>
            ) : (
              historyData.map((dateGroup, groupIndex) => (
                <div key={dateGroup.date} className={`history-date-group ${groupIndex < historyData.length - 1 ? '' : ''}`}>
                  {/* Date Header */}
                  <div className="history-date-header">
                    <h4 className="history-date-title">
                      {formatHistoryDate(dateGroup.date)}
                    </h4>
                  </div>

                  {/* Items for this date */}
                  <div className="history-items">
                    {dateGroup.items.map((item, itemIndex) => (
                      <div
                        key={item.id || `${itemIndex}-${item.timestamp}`}
                        className={`history-item ${item.type === 'note' ? 'history-item-note' : ''}`}
                      >
                        {/* Item Header */}
                        <div className="history-item-header">
                          <div className="history-item-type">
                            {item.type === 'note' ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                                <polyline points="9 11 12 14 22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                              </svg>
                            )}
                            <span className={`history-item-label ${item.type === 'note' ? 'history-item-label-note' : ''}`}>
                              {item.type === 'note' ? 'Note' : `Task ${item.action}`}
                            </span>
                          </div>
                          <span className="history-item-time">
                            {formatHistoryTime(item.timestamp)}
                          </span>
                        </div>

                        {/* Item Content */}
                        <div className={`history-item-content ${item.type === 'task' ? 'history-item-content-task' : ''}`}>
                          {item.content}
                        </div>

                        {/* Task Metadata */}
                        {item.type === 'task' && item.metadata && (
                          <div className="history-item-metadata">
                            {item.metadata.priority && item.metadata.priority !== 'none' && (
                              <span className="history-badge history-badge-priority">
                                {item.metadata.priority} priority
                              </span>
                            )}
                            {item.metadata.category && (
                              <span className="history-badge history-badge-category">
                                {item.metadata.category}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Note Type Badge */}
                        {item.type === 'note' && item.metadata?.noteType && (
                          <span className="history-badge history-badge-note-type">
                            {item.metadata.noteType === 'week' ? 'Week Notes' : 'Day Notes'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
