import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const TaskModal = ({ task = null, onClose, onSave, mode: initialMode = 'view' }) => {
  const [taskText, setTaskText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [goal, setGoal] = useState('');
  const [priority, setPriority] = useState('none');
  const [status, setStatus] = useState(null); // 'complete', 'in_progress', 'forward', or null
  const [goals, setGoals] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState(initialMode); // 'view' or 'edit'
  
  // Initialize form fields from task if provided
  useEffect(() => {
    if (task) {
      setTaskText(task.text || '');
      setDueDate(task.due ? new Date(task.due).toISOString().slice(0, 16) : '');
      setCategory(task.category || '');
      setGoal(task.goal || '');
      setPriority(task.priority || 'none');
      setStatus(task.status || null);
      setMode(initialMode);
    } else {
      // Reset for new task
      setTaskText('');
      setDueDate('');
      setCategory('');
      setGoal('');
      setPriority('none');
      setStatus(null);
      setMode('edit');
    }
  }, [task, initialMode]);

  const categories = [
    { value: 'work', label: 'Work' },
    { value: 'study', label: 'Study' },
    { value: 'personal', label: 'Personal' },
    { value: 'leisure', label: 'Leisure' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'travel', label: 'Travel' },
    { value: 'health', label: 'Health' },
    { value: 'rest', label: 'Rest' }
  ];

  const priorities = [
    { value: 'none', label: 'No Priority' },
    { value: 'low', label: 'Low Priority' },
    { value: 'high', label: 'High Priority' }
  ];

  const statusOptions = [
    { value: '', label: 'No Status' },
    { value: 'complete', label: 'Complete' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'forward', label: 'Forward' }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    loadGoals();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  
  // Helper functions to match TodoList styling
  const getTagColor = (category) => {
    const colors = {
      'work': '#3b82f6',
      'study': '#8b5cf6',
      'personal': '#ec4899',
      'leisure': '#10b981',
      'fitness': '#f59e0b',
      'travel': '#06b6d4',
      'health': '#ef4444',
      'rest': '#6366f1'
    };
    return colors[category?.toLowerCase()] || '#6b7280';
  };

  const getCategoryLabel = (category) => {
    if (!category) return '';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getDaysUntilDue = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueText = (dateString) => {
    const daysUntilDue = getDaysUntilDue(dateString);
    if (daysUntilDue === null) return { text: '', color: '#666', hours: null };
    
    const dueDate = new Date(dateString);
    const hours = dueDate.getHours();
    const minutes = dueDate.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    if (daysUntilDue < 0) {
      return { text: 'Past Due', color: '#dc2626', hours: timeStr };
    } else if (daysUntilDue === 0) {
      return { text: 'Due Today', color: '#dc2626', hours: timeStr };
    } else if (daysUntilDue === 1) {
      return { text: 'Due Tomorrow', color: '#f59e0b', hours: timeStr };
    } else if (daysUntilDue <= 7) {
      return { text: `Due in ${daysUntilDue} days`, color: '#f59e0b', hours: timeStr };
    } else {
      return { text: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: '#6b7280', hours: timeStr };
    }
  };

  const getPriorityFlagColor = (priority) => {
    if (priority === 'high') return '#dc2626';
    if (priority === 'low') return '#f59e0b';
    return '#9ca3af';
  };


  const loadGoals = async () => {
    // For now, use hardcoded goals from GoalsPage
    // In a real app, this would fetch from an API
    const sampleGoals = [
      { id: 1, title: 'Learn Spanish' },
      { id: 2, title: 'Read 24 Books' },
      { id: 3, title: 'Run Marathon' },
      { id: 4, title: 'Learn Piano' },
      { id: 5, title: 'Build Mobile App' }
    ];
    setGoals(sampleGoals);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskText.trim()) {
      setError('Task title is required');
      return;
    }
    if (!category) {
      setError('Category is required');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // Determine if we're updating an existing task or creating a new one
      const isUpdate = task && task.text;
      let taskIndex = -1;
      
      if (isUpdate) {
        // Fetch todos to find the index
        try {
          const todosRes = await apiFetch('/api/todos');
          if (todosRes.ok) {
            const todosList = await todosRes.json();
            taskIndex = todosList.findIndex(t => {
              const todoDue = t.due ? new Date(t.due).toISOString() : null;
              const taskDue = task.due ? new Date(task.due).toISOString() : null;
              return t.text === task.text && 
                     todoDue === taskDue &&
                     !t.completed;
            });
          }
        } catch (err) {
          console.error('Failed to fetch todos:', err);
        }
      }
      
      const method = isUpdate && taskIndex >= 0 ? 'PUT' : 'POST';
      const url = isUpdate && taskIndex >= 0 ? `/api/todos/${taskIndex}` : '/api/todos';
      
      const res = await apiFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todo: taskText,
          due: dueDate || null,
          category: category || '',
          goal: goal || null,
          priority: priority || 'none',
          status: status || null
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Task added successfully:', data);
        onSave();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to add task' }));
        setError(errorData.error || 'Failed to add task. Please try again.');
        console.error('Failed to add task:', errorData);
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: isMobile ? '12px' : '16px'
    }}
    onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '360px',
          padding: mode === 'view' ? (isMobile ? '16px' : '20px') : (isMobile ? '20px' : '24px'),
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(179, 229, 252, 0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {mode !== 'view' && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              color: '#1f2937',
              fontFamily: "'Recoleta Alt', serif"
            }}>
              {task ? 'Edit Task' : 'Add New Task'}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px'
              }}
            >
              ×
            </button>
          </div>
        )}
        {mode === 'view' && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '12px'
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {mode === 'view' && task ? (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #f3f4f6'
          }}>
            {/* Status Circle */}
            <div style={{ 
              flexShrink: 0, 
              marginTop: '2px',
            }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: task.status === 'complete' ? '2px solid #10b981' : 
                          task.status === 'in_progress' ? 'none' :
                          '2px solid #d1d5db',
                  background: task.status === 'complete' ? '#10b981' : 
                              task.status === 'in_progress' ? 'transparent' :
                              'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: task.status === 'complete' ? 'white' : 'transparent',
                  fontSize: '12px'
                }}
              >
                {task.status === 'complete' && '✓'}
                {task.status === 'in_progress' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Task Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? '#9ca3af' : '#1f2937',
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: '500',
                marginBottom: '8px',
                wordBreak: 'break-word'
              }}>
                {task.text || 'No title'}
              </div>

              {/* Tags and Due Date */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center'
              }}>
                {task.category && (
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: `${getTagColor(task.category)}20`,
                    color: getTagColor(task.category),
                    fontSize: '12px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}>
                    {getCategoryLabel(task.category)}
                  </span>
                )}
                {task.due && (() => {
                  const dueInfo = getDueText(task.due);
                  return dueInfo.text && !task.completed && (
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
                  );
                })()}
              </div>
            </div>

            {/* Priority Flag and Actions */}
            <div style={{ 
              flexShrink: 0,
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {!task.completed && (
                <div style={{ cursor: 'pointer' }}>
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill={getPriorityFlagColor(task.priority)} 
                    stroke={getPriorityFlagColor(task.priority)} 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: task.priority === 'none' ? 0.3 : 1 }}
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                    <line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </div>
              )}
              <button
                onClick={() => setMode('edit')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6b7280'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Error Message */}
            {error && (
              <div style={{
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            
            {/* Task Title */}
            <div>
              <input
                type="text"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Task title..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontWeight: '400',
                  background: '#ffffff',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#B3E5FC';
                  e.target.style.boxShadow = '0 0 0 4px rgba(179, 229, 252, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
                autoFocus
              />
            </div>

            {/* Goal */}
            <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: "'Inter Tight', sans-serif",
                  color: '#333333'
                }}>
                  Goal
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 40px 14px 16px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontFamily: "'Inter Tight', sans-serif",
                      outline: 'none',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                      appearance: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#B3E5FC';
                      e.target.style.boxShadow = '0 0 0 4px rgba(179, 229, 252, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Goal</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
              </div>

            {/* Category */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: "'Inter Tight', sans-serif",
                color: '#333333'
              }}>
                Category<span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 40px 14px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontFamily: "'Inter Tight', sans-serif",
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#B3E5FC';
                    e.target.style.boxShadow = '0 0 0 4px rgba(179, 229, 252, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: "'Inter Tight', sans-serif",
                color: '#333333'
              }}>
                Priority
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 40px 14px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontFamily: "'Inter Tight', sans-serif",
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#B3E5FC';
                    e.target.style.boxShadow = '0 0 0 4px rgba(179, 229, 252, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {priorities.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                fontFamily: "'Inter Tight', sans-serif",
                color: '#333333'
              }}>
                Status
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={status || ''}
                  onChange={(e) => setStatus(e.target.value || null)}
                  style={{
                    width: '100%',
                    padding: '14px 40px 14px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontFamily: "'Inter Tight', sans-serif",
                    outline: 'none',
                    background: '#ffffff',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#B3E5FC';
                    e.target.style.boxShadow = '0 0 0 4px rgba(179, 229, 252, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <div style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6b7280'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: '#333333',
                  fontSize: '14px',
                  fontFamily: "'Inter Tight', sans-serif",
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(249, 250, 251, 0.95)';
                  e.target.style.borderColor = '#B3E5FC';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                  e.target.style.borderColor = '#e0e0e0';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !taskText.trim() || !category}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '12px',
                  background: loading || !taskText.trim() || !category 
                    ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)' 
                    : 'linear-gradient(135deg, #B3E5FC 0%, #81D4FA 100%)',
                  color: loading || !taskText.trim() || !category ? '#6b7280' : '#000000',
                  fontSize: '14px',
                  fontFamily: "'Inter Tight', sans-serif",
                  fontWeight: '500',
                  cursor: loading || !taskText.trim() || !category ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: loading || !taskText.trim() || !category 
                    ? 'none' 
                    : '0 4px 12px rgba(179, 229, 252, 0.3)'
                }}
                onMouseOver={(e) => {
                  if (!loading && taskText.trim() && category) {
                    e.target.style.background = 'linear-gradient(135deg, #81D4FA 0%, #4FC3F7 100%)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(179, 229, 252, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && taskText.trim() && category) {
                    e.target.style.background = 'linear-gradient(135deg, #B3E5FC 0%, #81D4FA 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(179, 229, 252, 0.3)';
                  }
                }}
                onMouseDown={(e) => {
                  if (!loading && taskText.trim() && category) {
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default TaskModal;
