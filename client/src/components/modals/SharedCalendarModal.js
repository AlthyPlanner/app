import React, { useState } from 'react';

const SharedCalendarModal = ({ onClose, onSave, calendar = null }) => {
  const [name, setName] = useState(calendar?.name || '');
  const [email, setEmail] = useState(calendar?.email || '');
  const [color, setColor] = useState(calendar?.color || '#3b82f6');
  const [error, setError] = useState('');

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    onSave({ name: name.trim(), email: email.trim(), color });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          {calendar ? 'Edit Shared Calendar' : 'Add Shared Calendar'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Color
            </label>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: color === c ? '3px solid #1f2937' : '2px solid #e5e7eb',
                    background: c,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {calendar ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SharedCalendarModal;

