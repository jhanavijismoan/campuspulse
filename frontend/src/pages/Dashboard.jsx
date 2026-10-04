import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import HighlightCards from '../components/HighlightCards';
import MyWeek from '../components/MyWeek';
import PulseAI from '../components/PulseAI';
import NotificationsPanel from '../components/NotificationsPanel';
import AnnouncementProcessor from '../components/AnnouncementProcessor';
import InternshipWidget from '../components/InternshipWidget';
import CalendarWidget from '../components/CalendarWidget';
import DocumentsWidget from '../components/DocumentsWidget';
import AdminAnalytics from '../components/AdminAnalytics';
import { currentAcademicWeek } from '../utils/dates';
import AdminDashboard from './AdminDashboard';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StudentDashboard({ user }) {
  const [highlights, setHighlights] = useState([]);
  const [weekEvents, setWeekEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [internships, setInternships] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { from, to } = currentAcademicWeek();
    const tasks = [
      api.highlights().then(setHighlights).catch(() => setHighlights([])),
      api.events(from, to).then(setWeekEvents).catch(() => setWeekEvents([])),
      api.notifications().then(setNotifications).catch(() => setNotifications([])),
      api.internships().then(setInternships).catch(() => setInternships([])),
      api.documents().then(setDocuments).catch(() => setDocuments([])),
    ];
    if (user?.role === 'admin') {
      tasks.push(api.analyticsSummary().then(setAnalytics).catch(() => setAnalytics(null)));
    }
    Promise.all(tasks).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="text-sm text-gray-400 py-20 text-center">Loading your dashboard...</div>;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">
          {greeting()}, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here's what needs your attention.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6">
          <HighlightCards items={highlights} />
          <MyWeek events={weekEvents} />
        </div>
        <div className="space-y-6">
          <PulseAI />
          <NotificationsPanel items={notifications} />
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 ${user?.role === 'admin' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-6`}>
        <AnnouncementProcessor />
        <InternshipWidget internships={internships} />
        <CalendarWidget events={weekEvents} />
        <DocumentsWidget documents={documents} />
        {user?.role === 'admin' && <AdminAnalytics data={analytics} />}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboard /> : <StudentDashboard user={user} />;
}
