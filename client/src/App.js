import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CalendarPage from './components/pages/CalendarPage';
import TasksPage from './components/pages/TasksPage';
import GoalsPage from './components/pages/GoalsPage';
import ProfilePage from './components/pages/ProfilePage';
import AlthyPage from './components/pages/AlthyPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/plan" replace />} />
        <Route path="plan" element={<CalendarPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="althy" element={<AlthyPage />} />
      </Route>
    </Routes>
  );
};

export default App;

