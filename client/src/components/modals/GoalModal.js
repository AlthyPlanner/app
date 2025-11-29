import React, { useState, useEffect } from 'react';

const GoalModal = ({ goal, onClose, onSave }) => {
  const [type, setType] = useState('goal');
  const [goalTitle, setGoalTitle] = useState('');
  const [category, setCategory] = useState('work');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    if (goal) {
      setType(goal.type || 'goal');
      setGoalTitle(goal.title || '');
      setCategory(goal.category?.toLowerCase() || 'work');
      setTarget(goal.target || '');
      setDeadline(goal.deadline || '');
      if (goal.milestones && goal.milestones.length > 0) {
        const milestoneTexts = goal.milestones.map(m => m.text || m);
        while (milestoneTexts.length < 3) {
          milestoneTexts.push('');
        }
        setMilestones(milestoneTexts.slice(0, 3));
      } else {
        setMilestones(['', '', '']);
      }
    } else {
      setType('goal');
      setGoalTitle('');
      setCategory('work');
      setTarget('');
      setDeadline('');
      setMilestones(['', '', '']);
    }
  }, [goal]);

  const typeOptions = [
    { value: 'goal', label: 'Long-term Goal' },
    { value: 'habit', label: 'Habit' }
  ];

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMilestoneChange = (index, value) => {
    const newMilestones = [...milestones];
    newMilestones[index] = value;
    setMilestones(newMilestones);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    setLoading(true);
    try {
      // Filter out empty milestones
      const filteredMilestones = milestones
        .filter(m => m.trim() !== '')
        .map((text, index) => ({ id: index + 1, text, completed: false }));

      const goalData = {
        title: goalTitle.trim(),
        category,
        target: target.trim() || null,
        deadline: deadline.trim() || null,
        milestones: filteredMilestones,
        progress: goal?.progress || 0
      };

      // Call onSave with the data (parent component will handle API call)
      onSave(goalData);
      onClose();
    } catch (err) {
      console.error('Failed to save goal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
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
          marginBottom: '8px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '4px'
          }}>
            {goal ? 'Edit Goal' : 'Add New Goal'}
          </h2>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: '400'
          }}>
            Set a new goal with milestones and deadlines
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
            {/* Type */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Type
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 36px 12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    background: 'white',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
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

            {/* Goal Title */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Goal Title
              </label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g., Learn Spanish"
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
                required
              />
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
                Category
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 36px 12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    background: 'white',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    cursor: 'pointer'
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

            {/* Target */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Target
              </label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g., Conversational fluency"
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
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="e.g., Dec 2025"
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
            </div>

            {/* Milestones (Optional) */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Milestones (Optional)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {milestones.map((milestone, index) => (
                  <input
                    key={index}
                    type="text"
                    value={milestone}
                    onChange={(e) => handleMilestoneChange(index, e.target.value)}
                    placeholder={`Milestone ${index + 1}`}
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
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '8px',
              paddingTop: '16px'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
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
                disabled={loading || !goalTitle.trim()}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: loading || !goalTitle.trim() ? '#d1d5db' : '#06b6d4',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading || !goalTitle.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading && goalTitle.trim()) {
                    e.target.style.background = '#0891b2';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && goalTitle.trim()) {
                    e.target.style.background = '#06b6d4';
                  }
                }}
              >
                {loading ? 'Adding...' : 'Add Goal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalModal;

