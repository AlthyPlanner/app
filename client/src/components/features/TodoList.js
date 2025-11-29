import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const isMobile = () => window.innerWidth < 768;

const TodoList = ({ viewMode = 'all', dateFilter = 'today' }) => {
  const [todos, setTodos] = useState([]);
  const [types, setTypes] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editType, setEditType] = useState('');
  const [editPriority, setEditPriority] = useState('none');
  const [openStatusMenu, setOpenStatusMenu] = useState(null);
  const [openPriorityMenu, setOpenPriorityMenu] = useState(null);
  const [sortBy, setSortBy] = useState('time'); // 'time', 'priority', 'category'
  const [categoryFilter, setCategoryFilter] = useState(''); // '' means all categories

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

  const toggleTodo = async (todoId) => {
    try {
      const res = await apiFetch(`/api/todos/${todoId}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        loadTodos();
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  };

  const updateStatus = async (todoId, status) => {
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
      
      const res = await apiFetch(`/api/todos/${todoId}/status`, {
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
      if (openPriorityMenu !== null) {
        const menuContainer = event.target.closest('.priority-menu-container');
        const menuDropdown = event.target.closest('.priority-dropdown-menu');
        if (!menuContainer && !menuDropdown) {
          setOpenPriorityMenu(null);
        }
      }
    };
    if (openStatusMenu !== null || openPriorityMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openStatusMenu, openPriorityMenu]);

  const deleteTodo = async (todoId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await apiFetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadTodos();
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  // Helper function to parse dates consistently - handles YYYY-MM-DD format as local timezone
  const parseDate = (dateString) => {
    if (!dateString) return null;
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date-only string (YYYY-MM-DD) - parse as local timezone
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    } else {
      // ISO string or other format - parse normally
      return new Date(dateString);
    }
  };

  const getDaysUntilDue = (dateString) => {
    if (!dateString) return null;
    
    const dueDate = parseDate(dateString);
    if (!dueDate) return null;
    
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDueText = (dateString, dueTimeString = null) => {
    const daysUntilDue = getDaysUntilDue(dateString);
    if (daysUntilDue === null) return { text: '', color: '#666', hours: null };
    
    // Parse due_time if provided (from database)
    let timeStr = null;
    if (dueTimeString) {
      try {
        const dueTimeDate = new Date(dueTimeString);
        if (!isNaN(dueTimeDate.getTime())) {
          const hours = dueTimeDate.getHours();
          const minutes = dueTimeDate.getMinutes();
          timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
      } catch (e) {
        console.warn('Error parsing due_time:', e);
      }
    }
    
    let text, color;
    if (daysUntilDue < 0) {
      text = `Due ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} ago`;
      color = '#dc2626';
    } else if (daysUntilDue === 0) {
      text = `Due Today`;
      color = '#dc2626';
    } else if (daysUntilDue === 1) {
      text = `Due Tomorrow`;
      color = '#f97316';
    } else if (daysUntilDue <= 3) {
      text = `Due in ${daysUntilDue} days`;
      color = '#f97316';
    } else {
      text = `Due in ${daysUntilDue} days`;
      color = '#6b7280';
    }
    
    return { text, color, hours: timeStr };
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

  const getPriorityFlagColor = (priority) => {
    if (priority === 'high') return '#dc2626'; // Red
    if (priority === 'low') return '#3b82f6'; // Blue
    return '#9ca3af'; // Gray for none
  };

  const updatePriority = async (todoId, priority) => {
    try {
      const res = await apiFetch(`/api/todos/${todoId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      if (res.ok) {
        setOpenPriorityMenu(null);
        await loadTodos();
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  const getCategoryLabel = (category) => {
    if (!category) return '';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'work', label: 'Work' },
    { value: 'study', label: 'Study' },
    { value: 'personal', label: 'Personal' },
    { value: 'leisure', label: 'Leisure' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'travel', label: 'Travel' },
    { value: 'health', label: 'Health' },
    { value: 'rest', label: 'Rest' }
  ];

  const sortTodos = (todoList) => {
    const sorted = [...todoList];
    
    if (sortBy === 'time') {
      sorted.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1; // Tasks without due dates go to end
        if (!b.due) return -1;
        
        // Use parseDate helper to correctly handle date-only strings
        const dateA = parseDate(a.due);
        const dateB = parseDate(b.due);
        if (!dateA || !dateB) {
          if (!dateA && !dateB) return 0;
          return dateA ? -1 : 1;
        }
        return dateA.getTime() - dateB.getTime();
      });
    } else if (sortBy === 'priority') {
      sorted.sort((a, b) => {
        const priorityA = getDaysUntilDue(a.due);
        const priorityB = getDaysUntilDue(b.due);
        
        // Overdue (negative) comes first, then due today (0), then tomorrow (1), then others
        if (priorityA === null && priorityB === null) return 0;
        if (priorityA === null) return 1;
        if (priorityB === null) return -1;
        
        // Negative (overdue) comes first
        if (priorityA < 0 && priorityB >= 0) return -1;
        if (priorityA >= 0 && priorityB < 0) return 1;
        
        // Among overdue, more overdue comes first
        if (priorityA < 0 && priorityB < 0) return priorityA - priorityB;
        
        // Among non-overdue, lower number (sooner) comes first
        return priorityA - priorityB;
      });
    } else if (sortBy === 'category') {
      sorted.sort((a, b) => {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        if (catA === catB) {
          // If same category, sort by time
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          
          // Use parseDate helper to correctly handle date-only strings
          const dateA = parseDate(a.due);
          const dateB = parseDate(b.due);
          if (!dateA || !dateB) {
            if (!dateA && !dateB) return 0;
            return dateA ? -1 : 1;
          }
          return dateA.getTime() - dateB.getTime();
        }
        return catA.localeCompare(catB);
      });
    }
    
    return sorted;
  };

  const filterTodosByCategory = (todoList) => {
    if (!categoryFilter) return todoList;
    return todoList.filter(todo => (todo.category || '').toLowerCase() === categoryFilter.toLowerCase());
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
      
      // Parse date string - handle YYYY-MM-DD format as local timezone (not UTC)
      let dueDate;
      if (typeof todo.due === 'string' && todo.due.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date-only string (YYYY-MM-DD) - parse as local timezone
        const [year, month, day] = todo.due.split('-').map(Number);
        dueDate = new Date(year, month - 1, day);
      } else {
        // ISO string or other format - parse normally
        dueDate = new Date(todo.due);
      }
      dueDate.setHours(0, 0, 0, 0);
      
      if (effectiveDateFilter === 'today') {
        return dueDate.getTime() === today.getTime();
      } else if (effectiveDateFilter === 'tomorrow') {
        return dueDate.getTime() === tomorrow.getTime();
      } else if (effectiveDateFilter === 'thisWeek') {
        // Get the start of this week (Sunday)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        // Get the end of next 7 days from today
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        weekEnd.setHours(23, 59, 59, 999);
        // Include tasks from this week start to 7 days from today
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

  // Apply filters and sorting
  const filteredActiveTodos = filterTodosByDate(
    filterTodosByCategory(todos.filter(todo => !todo.completed))
  );
  const filteredCompletedTodos = filterTodosByCategory(
    todos.filter(todo => todo.completed)
  );
  
  const activeTodos = sortTodos(filteredActiveTodos);
  const completedTodos = sortTodos(filteredCompletedTodos);

  // Separate today's tasks from past due tasks (only for 'today' view)
  const getTodayAndPastDueTodos = () => {
    if (viewMode !== 'today' || dateFilter !== 'today') {
      return { todayTodos: activeTodos, pastDueTodos: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTodos = [];
    const pastDueTodos = [];

    // Use filteredActiveTodos before sorting to properly separate
    const preSortedActive = filterTodosByDate(
      filterTodosByCategory(todos.filter(todo => !todo.completed))
    );

    preSortedActive.forEach(todo => {
      if (!todo.due) {
        // Tasks without due dates go to today's list
        todayTodos.push(todo);
        return;
      }

      // Parse date string - handle YYYY-MM-DD format as local timezone (not UTC)
      let dueDate;
      if (typeof todo.due === 'string' && todo.due.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date-only string (YYYY-MM-DD) - parse as local timezone
        const [year, month, day] = todo.due.split('-').map(Number);
        dueDate = new Date(year, month - 1, day);
      } else {
        // ISO string or other format - parse normally
        dueDate = new Date(todo.due);
      }
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate.getTime() === today.getTime()) {
        todayTodos.push(todo);
      } else if (dueDate.getTime() < today.getTime()) {
        pastDueTodos.push(todo);
      }
    });

    // Apply sorting to separated lists
    return { 
      todayTodos: sortTodos(todayTodos), 
      pastDueTodos: sortTodos(pastDueTodos) 
    };
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
    const todoId = todo.id || index; // Use database ID if available, fallback to index
    const todoText = todo.text || todo.toString() || 'Unknown todo';
    const todoCompleted = todo.completed || false;
    const todoDue = todo.due || null;
    const todoDueTime = todo.due_time || null; // Get due_time from database
    const todoType = todo.type || todo.category || '';
    const todoStatus = todo.status || null;
    const todoPriority = todo.priority || 'none';
    const daysUntilDue = getDaysUntilDue(todoDue);
    const dueInfo = getDueText(todoDue, todoDueTime);
    const dueDatePriorityColor = getPriorityColor(daysUntilDue);
    const priorityFlagColor = getPriorityFlagColor(todoPriority);
    const tagColor = getTagColor(todoType);
    const mobile = isMobile();
    const isStatusMenuOpen = openStatusMenu === index;
    const isPriorityMenuOpen = openPriorityMenu === index;
    
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
          // Don't close menu if clicking inside the status menu area or priority menu area
          if (!e.target.closest('.status-menu-container') && !e.target.closest('.status-dropdown-menu') &&
              !e.target.closest('.priority-menu-container') && !e.target.closest('.priority-dropdown-menu')) {
            setOpenStatusMenu(null);
            setOpenPriorityMenu(null);
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
                      '2px solid #d1d5db',
              background: todoStatus === 'complete' ? '#10b981' : 
                          todoStatus === 'in_progress' ? 'transparent' :
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
                e.currentTarget.style.borderColor = status === 'complete' ? '#10b981' : '#d1d5db';
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
                  await updateStatus(todoId, 'complete');
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
                  await updateStatus(todoId, 'in_progress');
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
                  await updateStatus(todoId, 'forward');
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

        {/* Priority Flag Icon */}
        {!todoCompleted && (
          <div 
            className="priority-menu-container"
            style={{ 
            flexShrink: 0,
              marginTop: '2px',
              position: 'relative'
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                setOpenPriorityMenu(isPriorityMenuOpen ? null : index);
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill={priorityFlagColor} 
                stroke={priorityFlagColor} 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: todoPriority === 'none' ? 0.3 : 1 }}
              >
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </div>

            {/* Priority Dropdown Menu */}
            {isPriorityMenuOpen && (
              <div
                className="priority-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '28px',
                  right: 0,
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 10000,
                  minWidth: '140px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  pointerEvents: 'auto'
                }}
              >
                <div
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    await updatePriority(todoId, 'none');
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>No Priority</span>
                </div>
                <div
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    await updatePriority(todoId, 'low');
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Low Priority</span>
                </div>
                <div
                  onClick={async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    await updatePriority(todoId, 'high');
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>High Priority</span>
                </div>
              </div>
            )}
          </div>
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
                setEditingIndex(todoId);
                setEditText(todoText);
                // Set due date (date-only, YYYY-MM-DD format)
                if (todoDue) {
                  setEditDueDate(todoDue.split('T')[0] || todoDue.slice(0, 10));
                } else {
                  setEditDueDate('');
                }
                // Set due time from due_time field (HH:mm format)
                if (todo.due_time) {
                  const dueTimeDate = new Date(todo.due_time);
                  const hours = String(dueTimeDate.getHours()).padStart(2, '0');
                  const minutes = String(dueTimeDate.getMinutes()).padStart(2, '0');
                  setEditDueTime(`${hours}:${minutes}`);
                } else {
                  setEditDueTime('');
                }
                setEditType(todoType);
                setEditPriority(todoPriority);
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
                deleteTodo(todoId);
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
      {/* Sorting and Filter Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Category Filter Dropdown - Only show when sorting by category */}
        {sortBy === 'category' && (
          <div style={{ position: 'relative', minWidth: mobile ? '140px' : '160px' }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 32px 8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
                background: 'white',
                boxSizing: 'border-box',
                appearance: 'none',
                cursor: 'pointer',
                color: '#374151',
                fontWeight: '500'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <div style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              color: '#6b7280'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        )}

        {/* Sort By Dropdown */}
        <div style={{ position: 'relative', minWidth: mobile ? '120px' : '140px' }}>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              // Reset category filter when changing sort method
              if (e.target.value !== 'category') {
                setCategoryFilter('');
              }
            }}
            style={{
              width: '100%',
              padding: '8px 32px 8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              background: 'white',
              boxSizing: 'border-box',
              appearance: 'none',
              cursor: 'pointer',
              color: '#374151',
              fontWeight: '500'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          >
            <option value="time">By Time</option>
            <option value="priority">By Priority</option>
            <option value="category">By Category</option>
          </select>
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#6b7280'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

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
            {viewMode === 'all' ? 'All' : viewMode === 'thisWeek' ? 'This week' : 'Today'} ({activeTodos.length})
          </h3>
          <div>
            {activeTodos.map((todo, index) => {
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
              background: '#6A8FA6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(106, 143, 166, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#5a7f96';
              e.target.style.boxShadow = '0 4px 8px rgba(106, 143, 166, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#6A8FA6';
              e.target.style.boxShadow = '0 2px 4px rgba(106, 143, 166, 0.3)';
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

      {/* Completed Section - Show after empty state */}
      {completedTodos.length > 0 && (
        <div style={{ marginTop: '32px' }}>
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
                type="date"
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
              {editDueDate && (
                <input
                  type="time"
                  value={editDueTime}
                  onChange={(e) => setEditDueTime(e.target.value)}
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
              )}
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
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
                <option value="none">No Priority</option>
                <option value="low">Low Priority</option>
                <option value="high">High Priority</option>
              </select>
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
                      // Combine due date and time into due_time if both are provided
                      let dueTimeValue = null;
                      if (editDueDate && editDueTime) {
                        // Combine date and time into a datetime string (local timezone)
                        const [hours, minutes] = editDueTime.split(':').map(Number);
                        const dateTime = new Date(editDueDate);
                        dateTime.setHours(hours, minutes, 0, 0);
                        dueTimeValue = dateTime.toISOString();
                      }
                      
                      const requestBody = {
                        todo: editText,
                        due: editDueDate || null,
                        type: editType || '',
                        priority: editPriority || 'none'
                      };
                      
                      // Only include due_time if it's set
                      if (dueTimeValue) {
                        requestBody.due_time = dueTimeValue;
                      }
                      
                      const res = await apiFetch(`/api/todos/${editingIndex}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
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
