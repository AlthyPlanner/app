import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const isMobile = () => window.innerWidth < 768;

const TodoList = ({ viewMode = 'all', dateFilter = 'today' }) => {
  const [todos, setTodos] = useState([]);
  const [types, setTypes] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editType, setEditType] = useState('');
  const [openStatusMenu, setOpenStatusMenu] = useState(null);

  useEffect(() => {
    loadTodos();
    loadTypes();
  }, []);

  const loadTodos = async () => {
    try {
      const res = await apiFetch('/api/todos');
      const data = await res.json();
      if (res.ok) {
        setTodos(data.todos);
      }
    } catch (err) {
      console.error('Failed to load todos:', err);
    }
  };

  const loadTypes = async () => {
    try {
      const res = await apiFetch('/api/types');
      const data = await res.json();
      if (res.ok) {
        setTypes(data.types);
      }
    } catch (err) {
      console.error('Failed to load types:', err);
    }
  };

  const toggleTodo = async (index) => {
    try {
      const res = await apiFetch(`/api/todos/${index}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        loadTodos();
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const updateStatus = async (index, status) => {
    try {
      let requestBody = { status };
      
      // If forwarding, calculate date based on current view
      if (status === 'forward') {
        const effectiveDateFilter = viewMode === 'today' && dateFilter === 'today' ? 'today' :
                                    viewMode === 'thisWeek' && dateFilter === 'thisWeek' ? 'thisWeek' :
                                    dateFilter;
        
        let forwardDate = new Date();
        
        if (effectiveDateFilter === 'thisWeek') {
          // Forward to next week (same day of week, next week)
          forwardDate.setDate(forwardDate.getDate() + 7);
        } else {
          // Forward to tomorrow (default)
          forwardDate.setDate(forwardDate.getDate() + 1);
        }
        
        forwardDate.setHours(11, 0, 0, 0); // Set to 11am
        requestBody.due = forwardDate.toISOString();
      }
      
      const res = await apiFetch(`/api/todos/${index}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      if (res.ok) {
        setOpenStatusMenu(null);
        await loadTodos();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to update status:', errorData.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openStatusMenu !== null) {
        const menuContainer = event.target.closest('.status-menu-container');
        const menuDropdown = event.target.closest('.status-dropdown-menu');
        if (!menuContainer && !menuDropdown) {
          setOpenStatusMenu(null);
        }
      }
    };
    if (openStatusMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openStatusMenu]);

  const deleteTodo = async (index) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await apiFetch(`/api/todos/${index}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadTodos();
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  const getDaysUntilDue = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDueText = (dateString) => {
    const daysUntilDue = getDaysUntilDue(dateString);
    if (daysUntilDue === null) return { text: '', color: '#666', hours: null };
    
    const dueDate = new Date(dateString);
    const hours = dueDate.getHours();
    const minutes = dueDate.getMinutes();
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    let text, color;
    if (daysUntilDue < 0) {
      text = `Due ${Math.abs(daysUntilDue)} days ago`;
      color = '#dc2626';
    } else if (daysUntilDue === 0) {
      text = `Due Today`;
      color = '#dc2626';
    } else if (daysUntilDue === 1) {
      text = `Due in 2 hours`;
      color = '#dc2626';
    } else if (daysUntilDue <= 3) {
      text = `Due in ${daysUntilDue} days`;
      color = '#f97316';
    } else {
      text = `Due in ${daysUntilDue} days`;
      color = '#6b7280';
    }
    
    return { text, color, hours: daysUntilDue === 0 ? timeStr : null };
  };

  const getPriorityColor = (daysUntilDue) => {
    if (daysUntilDue === null) return null;
    if (daysUntilDue < 0) return '#dc2626'; // Red - overdue
    if (daysUntilDue === 0) return '#dc2626'; // Red - due today
    if (daysUntilDue === 1) return '#f97316'; // Orange - due tomorrow
    return null; // No indicator for far future
  };

  const getTagColor = (typeName) => {
    const colors = {
      'Work': '#3b82f6',
      'work': '#3b82f6',
      'Fitness': '#9333ea',
      'fitness': '#9333ea',
      'Study': '#10b981',
      'study': '#10b981',
      'Learn Spanish': '#6b7280',
      'Personal': '#ec4899',
      'personal': '#ec4899',
      'leisure': '#9333ea',
      'travel': '#06b6d4',
      'health': '#10b981',
      'rest': '#6b7280'
    };
    return colors[typeName] || '#6b7280';
  };

  const getCategoryLabel = (category) => {
    if (!category) return '';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const filterTodosByDate = (todoList) => {
    if (viewMode === 'all') return todoList;
    
    // Map new viewMode values to dateFilter if needed
    const effectiveDateFilter = viewMode === 'today' && dateFilter === 'today' ? 'today' :
                                viewMode === 'thisWeek' && dateFilter === 'thisWeek' ? 'thisWeek' :
                                dateFilter;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return todoList.filter(todo => {
      if (!todo.due) return false;
      const dueDate = new Date(todo.due);
      dueDate.setHours(0, 0, 0, 0);
      
      if (effectiveDateFilter === 'today') {
        return dueDate.getTime() === today.getTime();
      } else if (effectiveDateFilter === 'tomorrow') {
        return dueDate.getTime() === tomorrow.getTime();
      } else if (effectiveDateFilter === 'thisWeek') {
        // Get the start of this week (Sunday)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        // Get the end of this week (Saturday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return dueDate >= weekStart && dueDate <= weekEnd;
      } else if (effectiveDateFilter === 'nextWeek') {
        // Get the start of next week (Sunday)
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() - today.getDay() + 7);
        // Get the end of next week (Saturday)
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        nextWeekEnd.setHours(23, 59, 59, 999);
        return dueDate >= nextWeekStart && dueDate <= nextWeekEnd;
      }
      return true;
    });
  };

  const activeTodos = filterTodosByDate(todos.filter(todo => !todo.completed));
  const completedTodos = todos.filter(todo => todo.completed);

  // Separate today's tasks from past due tasks (only for 'today' view)
  const getTodayAndPastDueTodos = () => {
    if (viewMode !== 'today' || dateFilter !== 'today') {
      return { todayTodos: activeTodos, pastDueTodos: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTodos = [];
    const pastDueTodos = [];

    activeTodos.forEach(todo => {
      if (!todo.due) {
        // Tasks without due dates go to today's list
        todayTodos.push(todo);
        return;
      }

      const dueDate = new Date(todo.due);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate.getTime() === today.getTime()) {
        todayTodos.push(todo);
      } else if (dueDate.getTime() < today.getTime()) {
        pastDueTodos.push(todo);
      }
    });

    return { todayTodos, pastDueTodos };
  };

  const { todayTodos, pastDueTodos } = getTodayAndPastDueTodos();

  const getTimePeriodDescription = () => {
    if (viewMode === 'all') {
      return 'your tasks';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Map new viewMode values to dateFilter if needed
    const effectiveDateFilter = viewMode === 'today' && dateFilter === 'today' ? 'today' :
                                viewMode === 'thisWeek' && dateFilter === 'thisWeek' ? 'thisWeek' :
                                dateFilter;
    
    if (effectiveDateFilter === 'today') {
      return 'today';
    } else if (effectiveDateFilter === 'tomorrow') {
      return 'tomorrow';
    } else if (effectiveDateFilter === 'thisWeek') {
      return 'this week';
    } else if (effectiveDateFilter === 'nextWeek') {
      return 'next week';
    }
    return 'this period';
  };

  const renderTask = (todo, index) => {
    const todoText = todo.text || todo.toString() || 'Unknown todo';
    const todoCompleted = todo.completed || false;
    const todoDue = todo.due || null;
    const todoType = todo.type || todo.category || '';
    const todoStatus = todo.status || null;
    const daysUntilDue = getDaysUntilDue(todoDue);
    const dueInfo = getDueText(todoDue);
    const priorityColor = getPriorityColor(daysUntilDue);
    const tagColor = getTagColor(todoType);
    const mobile = isMobile();
    const isStatusMenuOpen = openStatusMenu === index;
    
    // Determine if we're in "this week" view
    const effectiveDateFilter = viewMode === 'today' && dateFilter === 'today' ? 'today' :
                                viewMode === 'thisWeek' && dateFilter === 'thisWeek' ? 'thisWeek' :
                                dateFilter;
    const isThisWeekView = effectiveDateFilter === 'thisWeek';

    return (
      <div
        key={index}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #f3f4f6',
          marginBottom: '12px',
          transition: 'all 0.2s ease',
          cursor: 'default',
          position: 'relative'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = '#e5e7eb';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = '#f3f4f6';
          e.currentTarget.style.boxShadow = 'none';
        }}
        onClick={(e) => {
          // Don't close menu if clicking inside the status menu area
          if (!e.target.closest('.status-menu-container') && !e.target.closest('.status-dropdown-menu')) {
            setOpenStatusMenu(null);
          }
        }}
      >
        {/* Status Circle with Dropdown */}
        <div 
          className="status-menu-container"
          style={{ 
            flexShrink: 0, 
            marginTop: '2px',
            position: 'relative'
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setOpenStatusMenu(isStatusMenuOpen ? null : index);
            }}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: todoStatus === 'complete' ? '2px solid #10b981' : 
                      todoStatus === 'in_progress' ? 'none' :
                      todoStatus === 'forward' ? '2px solid #f97316' :
                      '2px solid #d1d5db',
              background: todoStatus === 'complete' ? '#10b981' : 
                          todoStatus === 'in_progress' ? 'transparent' :
                          todoStatus === 'forward' ? 'white' :
                          'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: todoStatus === 'complete' ? 'white' : 'transparent',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseOver={(e) => {
              if (todoStatus !== 'in_progress') {
                e.currentTarget.style.borderColor = '#3b82f6';
              }
            }}
            onMouseOut={(e) => {
              const status = todoStatus;
              if (status === 'in_progress') {
                e.currentTarget.style.border = 'none';
              } else {
                e.currentTarget.style.borderColor = status === 'complete' ? '#10b981' : 
                                                   status === 'forward' ? '#f97316' : '#d1d5db';
              }
            }}
          >
            {todoStatus === 'complete' && '✓'}
            {todoStatus === 'in_progress' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            )}
            {todoStatus === 'forward' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                {/* Clock circle */}
                <circle cx="12" cy="12" r="10"/>
                {/* Shorter hand pointing right (3 o'clock) */}
                <line x1="12" y1="12" x2="15" y2="12" strokeWidth="2.5"/>
                {/* Longer hand pointing slightly up-right (around 1:10) */}
                <line x1="12" y1="12" x2="14" y2="8" strokeWidth="1.5"/>
              </svg>
            )}
          </div>

          {/* Status Dropdown Menu */}
          {isStatusMenuOpen && (
            <div
              className="status-dropdown-menu"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '28px',
                left: 0,
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 10000,
                minWidth: '160px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                pointerEvents: 'auto'
              }}
            >
              <div
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  await updateStatus(index, 'complete');
                }}
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  color: '#374151'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Complete</span>
              </div>
              <div
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  await updateStatus(index, 'in_progress');
                }}
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  color: '#374151',
                  borderTop: '1px solid #f3f4f6'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>In Progress</span>
              </div>
              <div
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  await updateStatus(index, 'forward');
                }}
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  color: '#374151',
                  borderTop: '1px solid #f3f4f6'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                  {isThisWeekView ? 'Forward to Next Week' : 'Forward to Tomorrow'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Task Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            textDecoration: todoCompleted ? 'line-through' : 'none',
            color: todoCompleted ? '#9ca3af' : '#1f2937',
            fontSize: mobile ? '15px' : '16px',
            fontWeight: '500',
            marginBottom: '8px',
            wordBreak: 'break-word'
          }}>
            {todoText}
          </div>

          {/* Tags and Due Date */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center'
          }}>
            {todoType && (
              <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                background: `${tagColor}20`,
                color: tagColor,
                fontSize: '12px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                {getCategoryLabel(todoType)}
              </span>
            )}
            {todoDue && dueInfo.text && !todoCompleted && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: dueInfo.color,
                fontSize: '12px'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{dueInfo.hours ? `${dueInfo.text} at ${dueInfo.hours}` : dueInfo.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Priority Indicator */}
        {priorityColor && !todoCompleted && (
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: priorityColor,
            flexShrink: 0,
            marginTop: '6px'
          }} />
        )}

        {/* Edit/Delete Buttons */}
        {!todoCompleted && (
          <div style={{
            display: 'flex',
            gap: '4px',
            flexShrink: 0
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingIndex(index);
                setEditText(todoText);
                setEditDueDate(todoDue ? new Date(todoDue).toISOString().slice(0, 16) : '');
                setEditType(todoType);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTodo(index);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };

  const mobile = isMobile();

  return (
    <div style={{ width: '100%' }}>
      {/* Today's Tasks Section (only for today view) */}
      {viewMode === 'today' && dateFilter === 'today' && todayTodos.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: mobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Today ({todayTodos.length})
          </h3>
          <div>
            {todayTodos.map((todo, index) => {
              const originalIndex = todos.findIndex(t => t === todo);
              return renderTask(todo, originalIndex);
            })}
          </div>
        </div>
      )}

      {/* Past Due Section (only for today view, shown after today's tasks) */}
      {viewMode === 'today' && dateFilter === 'today' && pastDueTodos.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: mobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#dc2626'
          }}>
            Past Due ({pastDueTodos.length})
          </h3>
          <div>
            {pastDueTodos.map((todo, index) => {
              const originalIndex = todos.findIndex(t => t === todo);
              return renderTask(todo, originalIndex);
            })}
          </div>
        </div>
      )}

      {/* Tasks Section (for other views) */}
      {!(viewMode === 'today' && dateFilter === 'today') && activeTodos.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: mobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {viewMode === 'all' ? 'All' : 'Today'} ({activeTodos.length})
          </h3>
          <div>
            {activeTodos.map((todo, index) => {
              const originalIndex = todos.findIndex(t => t === todo);
              return renderTask(todo, originalIndex);
            })}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completedTodos.length > 0 && (
        <div>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: mobile ? '18px' : '20px',
            fontWeight: '600',
            color: '#6b7280'
          }}>
            Completed ({completedTodos.length})
          </h3>
          <div>
            {completedTodos.map((todo, index) => {
              const originalIndex = todos.findIndex(t => t === todo);
              return renderTask(todo, originalIndex);
            })}
          </div>
        </div>
      )}

      {/* Empty State - No tasks for current filter */}
      {((viewMode === 'today' && dateFilter === 'today' && todayTodos.length === 0 && pastDueTodos.length === 0) || 
        (!(viewMode === 'today' && dateFilter === 'today') && activeTodos.length === 0)) && 
        viewMode !== 'all' && todos.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.4 }}>
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p style={{ fontSize: '16px', margin: '0 0 8px 0', fontWeight: '500', color: '#374151' }}>
            There is no task for {getTimePeriodDescription()}.
          </p>
          <button
            onClick={() => {
              window.location.href = '/app/althy';
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#2563eb';
              e.target.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#3b82f6';
              e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
            }}
          >
            Get help from Althy for {getTimePeriodDescription()}
          </button>
        </div>
      )}

      {/* Empty State - No tasks at all */}
      {todos.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#9ca3af'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p style={{ fontSize: '16px', margin: '0 0 16px 0' }}>No tasks yet. Add one to get started!</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingIndex !== null && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}
        onClick={() => setEditingIndex(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
              Edit Task
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Task text..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select Type</option>
                {types.map((type, index) => (
                  <option key={index} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setEditingIndex(null)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#374151',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiFetch(`/api/todos/${editingIndex}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          todo: editText,
                          due: editDueDate || null,
                          type: editType || ''
                        }),
                      });
                      if (res.ok) {
                        setEditingIndex(null);
                        loadTodos();
                      }
                    } catch (err) {
                      console.error('Failed to update todo:', err);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#374151',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoList;
