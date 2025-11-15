import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoalModal from '../modals/GoalModal';

const GoalsPage = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('goals'); // 'goals' or 'habits'
  const [sortBy, setSortBy] = useState('deadline'); // 'deadline', 'progress', etc.
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId !== null) {
        const menuContainer = event.target.closest('.goal-menu-container');
        const menuDropdown = event.target.closest('.goal-context-menu');
        if (!menuContainer && !menuDropdown) {
          setOpenMenuId(null);
        }
      }
    };
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const handleMarkComplete = (goalId) => {
    // In a real app, this would update the goal's progress to 100%
    console.log('Mark as complete:', goalId);
    setOpenMenuId(null);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setOpenMenuId(null);
    setShowGoalModal(true);
  };

  const handleDelete = (goalId) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      // In a real app, this would delete the goal
      console.log('Delete goal:', goalId);
      setOpenMenuId(null);
    }
  };

  // Sample data matching the design
  const goals = [
    {
      id: 1,
      title: 'Learn Spanish',
      category: 'Study',
      categoryColor: '#10b981',
      target: 'Conversational fluency',
      deadline: 'Dec 2025',
      progress: 45,
      milestones: [
        { id: 1, text: 'Complete beginner course', completed: true },
        { id: 2, text: 'Practice 30 min daily', completed: true },
        { id: 3, text: 'Hold 5-min conversation', completed: false }
      ]
    },
    {
      id: 2,
      title: 'Read 24 Books',
      category: 'Leisure',
      categoryColor: '#9333ea',
      target: '24 books/year',
      deadline: 'Dec 2025',
      progress: 33,
      milestones: [
        { id: 1, text: 'Read 8 books', completed: true },
        { id: 2, text: 'Read 16 books', completed: false },
        { id: 3, text: 'Read 24 books', completed: false }
      ]
    },
    {
      id: 3,
      title: 'Run Marathon',
      category: 'Fitness',
      categoryColor: '#ef6c00',
      target: 'Complete 26.2 miles',
      deadline: 'Jun 2025',
      progress: 20,
      milestones: [
        { id: 1, text: 'Run 5K', completed: true },
        { id: 2, text: 'Run 10K', completed: false },
        { id: 3, text: 'Run half marathon', completed: false }
      ]
    },
    {
      id: 4,
      title: 'Learn Piano',
      category: 'Leisure',
      categoryColor: '#9333ea',
      target: 'Play 5 songs',
      deadline: 'Mar 2025',
      progress: 60,
      milestones: [
        { id: 1, text: 'Learn basic chords', completed: true },
        { id: 2, text: 'Play first song', completed: true },
        { id: 3, text: 'Master 5 songs', completed: false }
      ]
    },
    {
      id: 5,
      title: 'Build Mobile App',
      category: 'Work',
      categoryColor: '#3b82f6',
      target: 'Launch on App Store',
      deadline: 'Aug 2025',
      progress: 15,
      milestones: [
        { id: 1, text: 'Design mockups', completed: true },
        { id: 2, text: 'Build MVP', completed: false },
        { id: 3, text: 'Submit for review', completed: false }
      ]
    }
  ];

  const totalGoals = goals.length;
  const totalHabits = 3; // Sample data
  const completedGoals = goals.filter(g => g.progress === 100).length;
  const totalMilestones = goals.reduce((sum, g) => sum + g.milestones.length, 0);

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      background: 'white',
      minHeight: 'calc(100vh - 80px)',
      paddingBottom: '120px',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Header Section */}
      <div style={{
        padding: isMobile ? '20px 16px 16px' : '24px 24px 20px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <h1 style={{
          margin: '0 0 20px 0',
          fontSize: isMobile ? '20px' : '24px',
          fontWeight: '600',
          color: '#1f2937',
          lineHeight: '1.3'
        }}>
          Here's how your long-term goals are shaping up.
        </h1>

        {/* Segmented Control */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '4px',
            flex: 1
          }}>
            <button
              onClick={() => setActiveTab('goals')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'goals' ? 'white' : 'transparent',
                color: activeTab === 'goals' ? '#1f2937' : '#6b7280',
                fontSize: '14px',
                fontWeight: activeTab === 'goals' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'goals' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Goals
            </button>
            <button
              onClick={() => setActiveTab('habits')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'habits' ? 'white' : 'transparent',
                color: activeTab === 'habits' ? '#1f2937' : '#6b7280',
                fontSize: '14px',
                fontWeight: activeTab === 'habits' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'habits' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Habits
            </button>
          </div>

          {/* Sort Button */}
          <button
            onClick={() => {
              // Toggle sort options
              setSortBy(sortBy === 'deadline' ? 'progress' : 'deadline');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f9fafb';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'white';
            }}
          >
            Sort: {sortBy === 'deadline' ? 'Deadline' : 'Progress'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 9l4-4 4 4"/>
              <path d="M8 15l4 4 4-4"/>
            </svg>
          </button>
        </div>

        {/* Goals Count */}
        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {totalGoals} goals
        </div>
      </div>

      {/* Your Progress Section */}
      <div style={{
        padding: isMobile ? '20px 16px' : '24px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <polyline points="3 3 7 9 13 5 21 9 21 21 3 21"/>
            </svg>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Your Progress
            </h2>
          </div>
          <span style={{
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Swipe &gt;
          </span>
        </div>

        {/* Progress Cards */}
        <div style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {/* Total Goals Card */}
          <div style={{
            minWidth: '140px',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#3b82f620',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              {totalGoals}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Total Goals
            </div>
          </div>

          {/* Total Habits Card */}
          <div style={{
            minWidth: '140px',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#10b98120',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              {totalHabits}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Total Habits
            </div>
          </div>

          {/* Completed Card */}
          <div style={{
            minWidth: '140px',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#f9731620',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <path d="M6 9H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
                <path d="M18 9h-2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
                <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/>
              </svg>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              {completedGoals}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Completed
            </div>
          </div>

          {/* Milestones Card */}
          <div style={{
            minWidth: '140px',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#9333ea20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              {totalMilestones}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Milestones
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div style={{
        padding: isMobile ? '20px 16px' : '24px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {activeTab === 'goals' && goals.map((goal) => (
          <div
            key={goal.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              position: 'relative'
            }}
          >
            {/* Ellipsis Menu */}
            <div className="goal-menu-container" style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === goal.id ? null : goal.id);
                }}
                style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  marginTop: '4px',
                  marginRight: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#1f2937';
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#6b7280';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="12" cy="5" r="1"/>
                  <circle cx="12" cy="19" r="1"/>
                </svg>
              </button>

              {/* Context Menu */}
              {openMenuId === goal.id && (
                <div
                  className="goal-context-menu"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '28px',
                    right: '0',
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '180px',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    padding: '4px 0'
                  }}
                >
                  <button
                    onClick={() => handleMarkComplete(goal.id)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'white',
                      color: '#10b981',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#f0fdf4';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'white';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" fill="#10b981"/>
                      <polyline points="9 12 11 14 15 10" stroke="white" strokeWidth="2.5" fill="none"/>
                    </svg>
                    Mark as Complete
                  </button>
                  <button
                    onClick={() => handleEdit(goal)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'white',
                      color: '#374151',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#f9fafb';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'white';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      border: 'none',
                      background: 'white',
                      color: '#dc2626',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#fef2f2';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'white';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Goal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {goal.title}
              </h3>
            </div>

            {/* Category Tag */}
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              background: `${goal.categoryColor}20`,
              color: goal.categoryColor,
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              {goal.category}
            </div>

            {/* Target and Deadline */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#374151',
                fontWeight: '500'
              }}>
                Target: {goal.target}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {goal.deadline}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Progress
                </span>
                <span style={{
                  fontSize: '14px',
                  color: '#1f2937',
                  fontWeight: '600'
                }}>
                  {goal.progress}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${goal.progress}%`,
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Milestones */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {goal.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    color: milestone.completed ? '#1f2937' : '#6b7280'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: milestone.completed ? 'none' : '2px solid #d1d5db',
                    background: milestone.completed ? '#3b82f6' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {milestone.completed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span style={{
                    textDecoration: milestone.completed ? 'line-through' : 'none',
                    opacity: milestone.completed ? 0.6 : 1
                  }}>
                    {milestone.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {activeTab === 'habits' && (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <p>Habits will appear here.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          style={{
            position: 'fixed',
            bottom: isMobile ? '100px' : '120px',
            right: isMobile ? '20px' : '40px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#374151',
            border: 'none',
            color: 'white',
            fontSize: '28px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
        >
          +
        </button>

        {/* Add Menu Dropdown */}
        {showAddMenu && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'transparent'
              }}
              onClick={() => setShowAddMenu(false)}
            />
            <div
              style={{
                position: 'fixed',
                bottom: isMobile ? '170px' : '190px',
                right: isMobile ? '20px' : '40px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1002,
                minWidth: '200px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb'
              }}
            >
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setShowGoalModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add manually
              </button>
              <div style={{
                height: '1px',
                background: '#e5e7eb'
              }} />
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  navigate('/app/althy');
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Let Althy help you
              </button>
            </div>
          </>
        )}
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <GoalModal
          goal={editingGoal}
          onClose={() => {
            setShowGoalModal(false);
            setEditingGoal(null);
          }}
          onSave={(goalData) => {
            // In a real app, this would save to an API
            if (editingGoal) {
              console.log('Updated goal:', goalData);
            } else {
              console.log('New goal:', goalData);
            }
            setShowGoalModal(false);
            setEditingGoal(null);
            // You could also update the goals state here if needed
          }}
        />
      )}
    </div>
  );
};

export default GoalsPage;
