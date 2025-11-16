import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoalModal from '../modals/GoalModal';
import './GoalsPage.css';

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
    <div className="goals-page">
      {/* Header Section */}
      <div className={`goals-header ${!isMobile ? 'goals-header-desktop' : ''}`}>
        <h1 className={`goals-title ${!isMobile ? 'goals-title-desktop' : ''}`}>
          Here's how your long-term goals are shaping up.
        </h1>

        {/* Segmented Control */}
        <div className="segmented-control-container">
          <div className="segmented-control">
            <button
              onClick={() => setActiveTab('goals')}
              className={`segmented-button ${activeTab === 'goals' ? 'segmented-button-active' : ''}`}
            >
              Goals
            </button>
            <button
              onClick={() => setActiveTab('habits')}
              className={`segmented-button ${activeTab === 'habits' ? 'segmented-button-active' : ''}`}
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
            className="sort-button"
          >
            Sort: {sortBy === 'deadline' ? 'Deadline' : 'Progress'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 9l4-4 4 4"/>
              <path d="M8 15l4 4 4-4"/>
            </svg>
          </button>
        </div>

        {/* Goals Count */}
        <div className="goals-count">
          {totalGoals} goals
        </div>
      </div>

      {/* Your Progress Section */}
      <div className={`progress-section ${!isMobile ? 'progress-section-desktop' : ''}`}>
        <div className="progress-header">
          <div className="progress-title-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <polyline points="3 15 6 17 12 10 21 6 21 21 3 21"/>
            </svg>
            <h2 className="progress-title">
              Your Progress
            </h2>
          </div>
          <span className="progress-swipe-hint">
            Swipe &gt;
          </span>
        </div>

        {/* Progress Cards */}
        <div className="progress-cards">
          {/* Total Goals Card */}
          <div className="progress-card">
            <div className="progress-card-icon progress-card-icon-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div className="progress-card-value">
              {totalGoals}
            </div>
            <div className="progress-card-label">
              Total Goals
            </div>
          </div>

          {/* Total Habits Card */}
          <div className="progress-card">
            <div className="progress-card-icon progress-card-icon-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div className="progress-card-value">
              {totalHabits}
            </div>
            <div className="progress-card-label">
              Total Habits
            </div>
          </div>

          {/* Completed Card */}
          <div className="progress-card">
            <div className="progress-card-icon progress-card-icon-orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                <path d="M6 9H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
                <path d="M18 9h-2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
                <path d="M12 1l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/>
              </svg>
            </div>
            <div className="progress-card-value">
              {completedGoals}
            </div>
            <div className="progress-card-label">
              Completed
            </div>
          </div>

          {/* Milestones Card */}
          <div className="progress-card">
            <div className="progress-card-icon progress-card-icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="progress-card-value">
              {totalMilestones}
            </div>
            <div className="progress-card-label">
              Milestones
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className={`goals-list ${!isMobile ? 'goals-list-desktop' : ''}`}>
        {activeTab === 'goals' && goals.map((goal) => (
          <div
            key={goal.id}
            className="goal-card"
          >
            {/* Ellipsis Menu */}
            <div className="goal-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === goal.id ? null : goal.id);
                }}
                className="goal-menu-button"
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
                >
                  <button
                    onClick={() => handleMarkComplete(goal.id)}
                    className="context-menu-item context-menu-item-complete"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" fill="#10b981"/>
                      <polyline points="9 12 11 14 15 10" stroke="white" strokeWidth="2.5" fill="none"/>
                    </svg>
                    Mark as Complete
                  </button>
                  <button
                    onClick={() => handleEdit(goal)}
                    className="context-menu-item"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="context-menu-item context-menu-item-delete"
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
            <div className="goal-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <h3 className="goal-title">
                {goal.title}
              </h3>
            </div>

            {/* Category Tag */}
            <div 
              className="goal-category-tag"
              style={{
              background: `${goal.categoryColor}20`,
                color: goal.categoryColor
              }}
            >
              {goal.category}
            </div>

            {/* Target and Deadline */}
            <div className="goal-target-section">
              <div className="goal-target">
                Target: {goal.target}
              </div>
              <div className="goal-deadline">
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
            <div className="goal-progress-section">
              <div className="goal-progress-header">
                <span className="goal-progress-label">
                  Progress
                </span>
                <span className="goal-progress-value">
                  {goal.progress}%
                </span>
              </div>
              <div className="goal-progress-bar-container">
                <div 
                  className="goal-progress-bar"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>

            {/* Milestones */}
            <div className="goal-milestones">
              {goal.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`goal-milestone ${milestone.completed ? 'goal-milestone-completed' : 'goal-milestone-pending'}`}
                >
                  <div className={`goal-milestone-checkbox ${milestone.completed ? 'goal-milestone-checkbox-completed' : ''}`}>
                    {milestone.completed && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className={`goal-milestone-text ${milestone.completed ? 'goal-milestone-text-completed' : ''}`}>
                    {milestone.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {activeTab === 'habits' && (
          <div className="habits-empty">
            <p>Habits will appear here.</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fab-container">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className={`fab-button ${!isMobile ? 'fab-button-desktop' : ''}`}
        >
          +
        </button>

        {/* Add Menu Dropdown */}
        {showAddMenu && (
          <>
            <div
              className="add-menu-overlay"
              onClick={() => setShowAddMenu(false)}
            />
            <div className={`add-menu-dropdown ${!isMobile ? 'add-menu-dropdown-desktop' : ''}`}>
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setShowGoalModal(true);
                }}
                className="add-menu-item"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add manually
              </button>
              <div className="add-menu-divider" />
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  navigate('/app/althy');
                }}
                className="add-menu-item"
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
