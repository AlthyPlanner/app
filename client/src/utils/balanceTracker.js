// Daily Balance Tracking Utilities

const CATEGORIES = {
  WORK: 'work',
  STUDY: 'study',
  FITNESS: 'fitness',
  REST: 'rest',
  LEISURE: 'leisure',
  PERSONAL: 'personal',
  HEALTH: 'health',
  TRAVEL: 'travel'
};

// Calculate hours spent in each category for a given day
export const calculateDailyBalance = (events, todos, date) => {
  const dayStart = new Date(date);
  dayStart.setHours(3, 0, 0, 0); // Day starts at 3am
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  dayEnd.setHours(2, 59, 59, 999);
  
  const categoryHours = {};
  Object.values(CATEGORIES).forEach(cat => {
    categoryHours[cat] = 0;
  });
  
  // Process events
  events.forEach(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    // Check if event overlaps with the day
    if (eventStart < dayEnd && eventEnd > dayStart) {
      const overlapStart = eventStart > dayStart ? eventStart : dayStart;
      const overlapEnd = eventEnd < dayEnd ? eventEnd : dayEnd;
      const hours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
      
      const category = event.category || event.categoryKey || CATEGORIES.WORK;
      const categoryKey = category.toLowerCase();
      
      if (categoryHours[categoryKey] !== undefined) {
        categoryHours[categoryKey] += hours;
      } else {
        categoryHours[CATEGORIES.WORK] += hours; // Default to work
      }
    }
  });
  
  // Process todos with due dates
  todos.forEach(todo => {
    if (todo.completed || !todo.due) return;
    
    const dueDate = new Date(todo.due);
    
    // Check if todo is due on this day
    if (dueDate >= dayStart && dueDate < dayEnd) {
      // Default 1 hour for tasks without duration
      const hours = 1;
      
      const category = todo.category || todo.type || CATEGORIES.WORK;
      const categoryKey = category.toLowerCase();
      
      if (categoryHours[categoryKey] !== undefined) {
        categoryHours[categoryKey] += hours;
      } else {
        categoryHours[CATEGORIES.WORK] += hours; // Default to work
      }
    }
  });
  
  return categoryHours;
};

// Calculate weekly balance
export const calculateWeeklyBalance = (events, todos, startDate) => {
  const weekBalance = {};
  Object.values(CATEGORIES).forEach(cat => {
    weekBalance[cat] = 0;
  });
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    const dayBalance = calculateDailyBalance(events, todos, day);
    
    Object.keys(dayBalance).forEach(cat => {
      weekBalance[cat] = (weekBalance[cat] || 0) + dayBalance[cat];
    });
  }
  
  return weekBalance;
};

// Check if day is overloaded
export const isOverloaded = (categoryHours) => {
  const workStudyHours = (categoryHours[CATEGORIES.WORK] || 0) + (categoryHours[CATEGORIES.STUDY] || 0);
  
  // Overloaded if work + study >= 10 hours
  if (workStudyHours >= 10) {
    return true;
  }
  
  // Check if 80% of free time is filled
  const totalHours = Object.values(categoryHours).reduce((sum, hours) => sum + hours, 0);
  const freeTimeHours = 24 - 8; // Assuming 8 hours for sleep
  const percentageFilled = (totalHours / freeTimeHours) * 100;
  
  return percentageFilled >= 80;
};

// Check if user has no rest/leisure in last N days
export const hasNoRestLeisure = (events, todos, days = 3) => {
  const today = new Date();
  today.setHours(3, 0, 0, 0);
  
  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    
    const dayBalance = calculateDailyBalance(events, todos, checkDate);
    const restLeisureHours = (dayBalance[CATEGORIES.REST] || 0) + (dayBalance[CATEGORIES.LEISURE] || 0);
    
    if (restLeisureHours > 0) {
      return false; // Found rest/leisure in this period
    }
  }
  
  return true; // No rest/leisure found in last N days
};

// Get sleep hours (placeholder - would need sleep tracking data)
export const getSleepHours = (date) => {
  // This would typically come from a sleep tracking API or user input
  // For now, return null to indicate no data
  return null;
};

// Calculate daily status
export const calculateDailyStatus = (events, todos, date, sleepHours = null) => {
  const categoryHours = calculateDailyBalance(events, todos, date);
  const overloaded = isOverloaded(categoryHours);
  
  // Check sleep
  const lowSleep = sleepHours !== null && sleepHours < 6;
  
  // Check rest/leisure
  const noRestLeisure = (categoryHours[CATEGORIES.REST] || 0) + (categoryHours[CATEGORIES.LEISURE] || 0) === 0;
  
  if (overloaded || lowSleep) {
    return {
      status: 'overloaded',
      color: '#dc2626',
      icon: '🔴',
      message: overloaded 
        ? "That's a full day — want to keep some buffer time?"
        : "Looks like you slept less than usual — want a lighter plan today?"
    };
  }
  
  // Check if approaching overload (work + study >= 8 hours)
  const workStudyHours = (categoryHours[CATEGORIES.WORK] || 0) + (categoryHours[CATEGORIES.STUDY] || 0);
  if (workStudyHours >= 8) {
    return {
      status: 'busy',
      color: '#f59e0b',
      icon: '🟡',
      message: "That's quite a lot — want to keep some buffer time?"
    };
  }
  
  // Check for no rest/leisure in last 3 days
  if (noRestLeisure && hasNoRestLeisure(events, todos, 3)) {
    return {
      status: 'busy',
      color: '#f59e0b',
      icon: '🟡',
      message: "You've been working hard — maybe add some downtime?"
    };
  }
  
  return {
    status: 'balanced',
    color: '#10b981',
    icon: '🟢',
    message: null
  };
};

// Get workflow message based on time of day
export const getWorkflowMessage = (events, todos) => {
  const hour = new Date().getHours();
  const today = new Date();
  
  // Morning (6am - 11am)
  if (hour >= 6 && hour < 11) {
    const todayBalance = calculateDailyBalance(events, todos, today);
    const totalHours = Object.values(todayBalance).reduce((sum, h) => sum + h, 0);
    
    if (totalHours < 2) {
      return {
        message: "Your day is open — want me to help you plan it?",
        action: "AI Plan My Day",
        showButton: true
      };
    }
  }
  
  // Midday (11am - 3pm)
  if (hour >= 11 && hour < 15) {
    const todayBalance = calculateDailyBalance(events, todos, today);
    const isOver = isOverloaded(todayBalance);
    
    if (isOver) {
      return {
        message: "That's quite a lot — want to keep some buffer time?",
        action: null,
        showButton: false
      };
    }
  }
  
  // Evening (6pm - 11pm)
  if (hour >= 18 && hour < 23) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Get Sunday
    const weekBalance = calculateWeeklyBalance(events, todos, weekStart);
    
    const workHours = weekBalance[CATEGORIES.WORK] || 0;
    const avgWorkHours = workHours / 7;
    
    if (avgWorkHours > 8) {
      return {
        message: "You worked a lot this week — should we add more rest or personal time next week?",
        action: null,
        showButton: false
      };
    }
  }
  
  return null;
};

