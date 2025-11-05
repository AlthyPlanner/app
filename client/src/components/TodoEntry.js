import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const TodoEntry = ({ onAddTodo }) => {
  const [newTodo, setNewTodo] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newType, setNewType] = useState('');
  const [types, setTypes] = useState([]);

  // Load types on component mount
  useEffect(() => {
    loadTypes();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    try {
      const todoData = { 
        todo: newTodo,
        due: newDueDate || null,
        type: newType || ''
      };
      
      const res = await apiFetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todoData),
      });
      
      if (res.ok) {
        setNewTodo('');
        setNewDueDate('');
        setNewType('');
        onAddTodo(); // Callback to refresh the todo list
      }
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  };

  return (
    <div style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', padding: 20, borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '16px', color: '#2c3e50', fontSize: '24px', fontWeight: '600' }}>Add New Todo</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new todo..."
            style={{ 
              flex: 1, 
              padding: '12px 16px', 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              fontSize: '14px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2196F3'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            style={{ 
              padding: '12px 16px', 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              fontSize: '14px',
              minWidth: '140px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2196F3'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
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
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            style={{ 
              padding: '12px 16px', 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              fontSize: '14px',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2196F3'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
          <button 
            type="submit" 
            style={{ 
              padding: '12px 24px', 
              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            Add Todo
          </button>
        </div>
      </form>
    </div>
  );
};

export default TodoEntry; 