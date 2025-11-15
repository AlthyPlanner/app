import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const TaskModal = ({ onClose, onSave }) => {
  const [taskText, setTaskText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [goal, setGoal] = useState('');
  const [priority, setPriority] = useState('none');
  const [goals, setGoals] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);

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
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    loadGoals();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!taskText.trim()) return;

    setLoading(true);
    try {
      const res = await apiFetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todo: taskText,
          due: dueDate || null,
          category: category || '',
          goal: goal || null
        }),
      });

      if (res.ok) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: isMobile ? '16px' : '24px'
    }}
    onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          padding: isMobile ? '20px' : '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Add New Task
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Task Title */}
            <div>
              <input
                type="text"
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Task title..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontWeight: '500'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                }}
                autoFocus
              />
            </div>

            {/* Two Column Grid for Goal, Category, Priority, Deadline */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '12px'
            }}>
              {/* Goal */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Goal
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 36px 12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white',
                      boxSizing: 'border-box',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
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
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  color: '#374151'
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
                      padding: '12px 36px 12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white',
                      boxSizing: 'border-box',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
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
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  color: '#374151'
                }}>
                  Priority
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 36px 12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white',
                      boxSizing: 'border-box',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
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
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Deadline
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 36px 12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#6b7280'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
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
                  padding: '12px 24px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#374151',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !taskText.trim() || !category}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: loading || !taskText.trim() || !category ? '#d1d5db' : '#374151',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading || !taskText.trim() || !category ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading && taskText.trim() && category) {
                    e.target.style.background = '#1f2937';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && taskText.trim() && category) {
                    e.target.style.background = '#374151';
                  }
                }}
              >
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
