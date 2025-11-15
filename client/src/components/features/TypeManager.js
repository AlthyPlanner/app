import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const TypeManager = () => {
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

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

  const addType = async (e) => {
    e.preventDefault();
    if (!newType.trim()) return;
    
    try {
      const typeData = { 
        name: newType
      };
      
      const res = await apiFetch('/api/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeData),
      });
      
      if (res.ok) {
        setNewType('');
        loadTypes();
      }
    } catch (err) {
      console.error('Failed to add type:', err);
    }
  };

  const startEdit = (index, type) => {
    setEditingIndex(index);
    setEditName(type.name);
  };

  const saveEdit = async (index) => {
    try {
      const res = await apiFetch(`/api/types/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editName
        }),
      });
      if (res.ok) {
        setEditingIndex(null);
        setEditName('');
        loadTypes();
      }
    } catch (err) {
      console.error('Failed to update type:', err);
    }
  };

  const deleteType = async (index) => {
    try {
      const res = await apiFetch(`/api/types/${index}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadTypes();
      }
    } catch (err) {
      console.error('Failed to delete type:', err);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div style={{ 
      position: 'relative',
      zIndex: isExpanded ? 1000 : 1
    }}>
      {/* Header with toggle button - always visible */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: 'linear-gradient(135deg, #f0f8ff, #e3f2fd)', 
        padding: '12px 16px', 
        borderRadius: '8px', 
        marginBottom: '1rem', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      }} onClick={toggleExpanded}>
        <h2 style={{ color: '#2c3e50', fontSize: '20px', fontWeight: '600', margin: 0 }}>Types</h2>
        <span style={{ 
          fontSize: '16px',
          color: '#2c3e50',
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
        }}>
          ▶
        </span>
      </div>
      
      {/* Collapsible content - overlay */}
      {isExpanded && (
        <div style={{ 
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #f0f8ff, #e3f2fd)', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          zIndex: 1001,
          border: '1px solid #e3f2fd'
        }}>
          {/* Add Type Form */}
          <form onSubmit={addType} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="Type name..."
                style={{ 
                  flex: 1, 
                  padding: '10px 12px', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'border-color 0.2s ease',
                  minWidth: 0
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
                required
              />
              <button 
                type="submit" 
                style={{ 
                  padding: '10px 16px', 
                  background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
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
                Add
              </button>
            </div>
          </form>
          
          {/* Types List */}
          <div>
            <h3 style={{ marginBottom: '12px', color: '#333', fontSize: '18px', fontWeight: '500' }}>List ({types.length})</h3>
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto' }}>
              {types.map((type, index) => (
                <li key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px 0',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  {editingIndex === index ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ 
                          flex: 1, 
                          padding: '10px 12px', 
                          border: '1px solid #ddd', 
                          borderRadius: '6px', 
                          fontSize: '14px',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                        }}
                        required
                      />
                      <button 
                        onClick={() => saveEdit(index)} 
                        style={{ 
                          marginRight: '8px', 
                          padding: '8px 12px', 
                          background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
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
                        ✓
                      </button>
                      <button 
                        onClick={() => setEditingIndex(null)} 
                        style={{ 
                          padding: '8px 12px', 
                          background: 'linear-gradient(135deg, #f44336, #da190b)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
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
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1, fontSize: '16px', color: '#2c3e50', fontWeight: '500' }}>
                        {type.name}
                      </div>
                      <button 
                        onClick={() => startEdit(index, type)} 
                        style={{ 
                          marginRight: '8px', 
                          padding: '8px 16px', 
                          background: 'transparent',
                          color: '#2196F3',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '16px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: 'none'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.opacity = '0.8';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.opacity = '1';
                        }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => deleteType(index)} 
                        style={{ 
                          padding: '8px 16px', 
                          background: 'transparent',
                          color: '#f44336',
                          border: 'none', 
                          borderRadius: '6px',
                          fontSize: '16px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: 'none'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.opacity = '0.8';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.opacity = '1';
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            
            {types.length === 0 && (
              <p style={{ color: '#666', fontStyle: 'italic', fontSize: '14px', textAlign: 'center', padding: '20px' }}>No types yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TypeManager; 