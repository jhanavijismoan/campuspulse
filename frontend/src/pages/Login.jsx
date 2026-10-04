import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('jhanavi@mountcarmel.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-brand-700 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo-full.png" alt="CampusPulse" className="h-32 w-auto object-contain drop-shadow-xl" />
        </div>

        <form onSubmit={handleSubmit} className="card p-7">
          <h1 className="text-lg font-semibold text-navy-950 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to your campus dashboard</p>

          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />

          <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />

          {error && <p className="text-sm text-urgent-600 mb-3">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 transition text-white text-sm font-medium py-2.5 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="mt-5 text-xs text-gray-400 border-t border-gray-100 pt-4 space-y-1">
            <p>Demo accounts:</p>
            <p>Student: jhanavi@mountcarmel.edu / password123</p>
            <p>Admin: admin@mountcarmel.edu / password123</p>
          </div>
        </form>
      </div>
    </div>
  );
}
