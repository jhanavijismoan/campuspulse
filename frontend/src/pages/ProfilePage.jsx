import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold text-navy-950">Profile</h1>

      <div className="card p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-brand-500 text-white text-xl font-semibold flex items-center justify-center mx-auto mb-3">
          {user?.full_name?.[0]}
        </div>
        <p className="font-semibold text-navy-950">{user?.full_name}</p>
        <p className="text-sm text-gray-500">{user?.email}</p>

        <div className="mt-5 text-left space-y-2 text-sm border-t border-gray-100 pt-4">
          <div className="flex justify-between">
            <span className="text-gray-400">University</span>
            <span className="text-navy-950 font-medium">{user?.university_name}</span>
          </div>
          {user?.program && (
            <div className="flex justify-between">
              <span className="text-gray-400">Program</span>
              <span className="text-navy-950 font-medium">{user.program}</span>
            </div>
          )}
          {user?.semester && (
            <div className="flex justify-between">
              <span className="text-gray-400">Semester</span>
              <span className="text-navy-950 font-medium">{user.semester}</span>
            </div>
          )}
          {user?.section && (
            <div className="flex justify-between">
              <span className="text-gray-400">Section</span>
              <span className="text-navy-950 font-medium">{user.section}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Role</span>
            <span className="text-navy-950 font-medium capitalize">{user?.role}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-medium text-urgent-600 border border-urgent-100 hover:bg-urgent-50 rounded-lg py-2.5"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
