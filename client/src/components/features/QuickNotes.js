import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const QuickNotes = ({ date }) => {
  const [notes, setNotes] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get storage key for the given date/week
  const getStorageKey = (dateObj) => {
    if (!dateObj || !dateObj.date) return null;
    const dateKey = dateObj.date; // Already in YYYY-MM-DD format
    if (dateObj.type === 'week') {
      return `quickNotes-week-${dateKey}`;
    }
    return `quickNotes-${dateKey}`;
  };

  // Load notes from localStorage for the specific date/week
  useEffect(() => {
    if (!date) {
      setNotes('');
      return;
    }
    const storageKey = getStorageKey(date);
    if (storageKey) {
      const savedNotes = localStorage.getItem(storageKey);
      if (savedNotes) {
        setNotes(savedNotes);
      } else {
        setNotes('');
      }
    }
  }, [date]);

  const handleChange = (e) => {
    const value = e.target.value;
    setNotes(value);
    if (date) {
      const storageKey = getStorageKey(date);
      if (storageKey) {
        localStorage.setItem(storageKey, value);
      }
    }
  };

  const handleBlur = async () => {
    if (isSaving) return;
    setIsSaving(true);
    // Could save to API here if needed
    setTimeout(() => setIsSaving(false), 500);
  };

  return (
    <div style={{
      background: '#f9fafb',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <h3 style={{
          margin: 0,
          fontSize: isMobile ? '14px' : '15px',
          fontWeight: '600',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {date ? (date.type === 'week' ? 'Notes - This Week' : `Notes - ${new Date(date.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`) : 'Notes'}
        </h3>
      </div>
      <textarea
        value={notes}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Write your notes here..."
        style={{
          width: '100%',
          minHeight: '80px',
          maxHeight: '120px',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          fontSize: isMobile ? '14px' : '15px',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          background: 'white',
          transition: 'all 0.2s ease',
          boxSizing: 'border-box',
          lineHeight: '1.5',
          color: '#374151'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#9333ea';
          e.target.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e5e7eb';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
};

export default QuickNotes;

