import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import TodoEntry from './TodoEntry';

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [types, setTypes] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editType, setEditType] = useState('');

  // Load todos and types on component mount
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

  const startEdit = (index, text, due, type) => {
    setEditingIndex(index);
    setEditText(text);
    setEditDueDate(due || '');
    setEditType(type || '');
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

  const saveEdit = async (index) => {
    try {
      const res = await apiFetch(`/api/todos/${index}`, {
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
        setEditText('');
        setEditDueDate('');
        setEditType('');
        loadTodos();
      }
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const deleteTodo = async (index) => {
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDaysUntilDue = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    
    // Reset time to compare only dates
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getDueText = (dateString) => {
    const daysUntilDue = getDaysUntilDue(dateString);
    if (daysUntilDue === null) return { text: '', color: '#666' };
    
    let text, color;
    if (daysUntilDue < 0) {
      text = `overdue by ${Math.abs(daysUntilDue)} days`;
      color = '#d32f2f'; // Red for overdue
    } else if (daysUntilDue === 0) {
      text = 'due today';
      color = '#d32f2f'; // Red for due today
    } else if (daysUntilDue === 1) {
      text = 'due tomorrow';
      color = '#d32f2f'; // Red for due tomorrow
    } else if (daysUntilDue <= 3) {
      text = `due in ${daysUntilDue} days`;
      color = '#f57c00'; // Orange for 1-3 days
    } else {
      text = `due in ${daysUntilDue} days`;
      color = '#666'; // Gray for more than 3 days
    }
    
    return { text, color };
  };

  const activeTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  const renderTodoItem = (todo, originalIndex, isCompleted = false) => {
    // Handle different todo formats
    const todoText = todo.text || todo.toString() || 'Unknown todo';
    const todoCompleted = todo.completed || false;
    const todoDue = todo.due || null;
    const todoType = todo.type || '';
    
    const buttonStyle = {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    };

    const saveButtonStyle = {
      ...buttonStyle,
      background: 'linear-gradient(135deg, #4CAF50, #45a049)',
      color: 'white'
    };

    const cancelButtonStyle = {
      ...buttonStyle,
      background: 'linear-gradient(135deg, #f44336, #da190b)',
      color: 'white'
    };

    const editButtonStyle = {
      ...buttonStyle,
      background: 'transparent',
      color: '#2196F3',
      marginRight: '8px',
      boxShadow: 'none'
    };

    const deleteButtonStyle = {
      ...buttonStyle,
      background: 'transparent',
      color: '#f44336',
      boxShadow: 'none'
    };
    
    return (
      <li key={originalIndex} style={{ 
        padding: '12px 0',
        borderBottom: '1px solid #eee',
        opacity: isCompleted ? 0.7 : 1
      }}>
        {editingIndex === originalIndex ? (
          <>
            {/* First row - Edit fields */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                placeholder="Todo text..."
              />
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                style={{ padding: '10px 12px', minWidth: '120px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
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
                style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
              />
            </div>
            {/* Second row - Save/Cancel buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => saveEdit(originalIndex)} 
                style={saveButtonStyle}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                Save
              </button>
              <button 
                onClick={() => setEditingIndex(null)} 
                style={cancelButtonStyle}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={todoCompleted}
              onChange={() => toggleTodo(originalIndex)}
              style={{ marginRight: 12, transform: 'scale(1.2)' }}
            />
            <div style={{ flex: 1 }}>
              <span style={{ 
                textDecoration: todoCompleted ? 'line-through' : 'none',
                color: todoCompleted ? '#666' : '#000',
                fontSize: '16px'
              }}>
                {todoText}
              </span>
              <div style={{ 
                fontSize: '0.8em', 
                color: '#666', 
                marginTop: '4px' 
              }}>
                {todoType && <span style={{ marginRight: '12px', padding: '2px 8px', background: '#e3f2fd', borderRadius: '12px', color: '#1976d2', fontSize: '11px' }}>{todoType}</span>}
                {todoDue && (
                  <span style={{ 
                    marginRight: '12px',
                    color: getDueText(todoDue).color,
                    fontSize: '11px'
                  }}>
                    Due: {formatDate(todoDue)} ({getDueText(todoDue).text})
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => startEdit(originalIndex, todoText, todoDue, todoType)} 
              style={editButtonStyle}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              title="Edit"
            >
              ✏️
            </button>
            <button 
              onClick={() => deleteTodo(originalIndex)} 
              style={deleteButtonStyle}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      <TodoEntry onAddTodo={loadTodos} />
      
      <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
        <h2>Todo List</h2>
        
        {/* Active Todos */}
        {activeTodos.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>Active Tasks</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {activeTodos.map((todo, index) => {
                const originalIndex = todos.findIndex(t => t === todo);
                return renderTodoItem(todo, originalIndex);
              })}
            </ul>
          </div>
        )}
        
        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '0.5rem', color: '#666' }}>Completed Tasks</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {completedTodos.map((todo, index) => {
                const originalIndex = todos.findIndex(t => t === todo);
                return renderTodoItem(todo, originalIndex, true);
              })}
            </ul>
          </div>
        )}
        
        {todos.length === 0 && (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No todos yet. Add one above!</p>
        )}
      </div>
    </div>
  );
};

export default TodoList; 