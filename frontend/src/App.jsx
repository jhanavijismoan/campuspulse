import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyWeekPage from './pages/MyWeekPage';
import CalendarPage from './pages/CalendarPage';
import InternshipsPage from './pages/InternshipsPage';
import DocumentsPage from './pages/DocumentsPage';
import PulseAIPage from './pages/PulseAIPage';
import NotificationsPage from './pages/NotificationsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ProfilePage from './pages/ProfilePage';
import ClassAttendancePage from './pages/ClassAttendancePage';
import StudentQueriesPage from './pages/StudentQueriesPage';
import ClassesPage from './pages/ClassesPage';
import TasksPage from './pages/TasksPage';
import ReportsPage from './pages/ReportsPage';
import CVBuilderPage from './pages/CVBuilderPage';
import SeatingPage from './pages/SeatingPage';
import AttendancePage from './pages/AttendancePage';
import TimetablePage from './pages/TimetablePage';
import CIAMarksPage from './pages/CIAMarksPage';
import QuizGeneratorPage from './pages/QuizGeneratorPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/my-week" element={<MyWeekPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/internships" element={<InternshipsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/pulse-ai" element={<PulseAIPage />} />
            <Route path="/cv-builder" element={<CVBuilderPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/classes/:id/attendance" element={<ClassAttendancePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/student-queries" element={<StudentQueriesPage />} />
            <Route path="/seating" element={<SeatingPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/cia-marks" element={<CIAMarksPage />} />
            <Route path="/quiz-generator" element={<QuizGeneratorPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
