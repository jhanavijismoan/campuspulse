import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ClipboardCheck } from 'lucide-react';
import { api } from '../api/client';

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.classes().then(setClasses).catch(() => setClasses([])).finally(() => setLoading(false));
  }, []);

  const totalStudents = classes.reduce((sum, c) => sum + Number(c.student_count || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">My Classes</h1>
        <p className="text-sm text-gray-500 mt-1">All classes assigned to you this semester.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-navy-950">{classes.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Classes</p>
        </div>
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-navy-950">{totalStudents}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Students</p>
        </div>
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-navy-950">{new Set(classes.map((c) => c.program)).size}</p>
          <p className="text-xs text-gray-500 mt-0.5">Programs</p>
        </div>
        <div className="card rounded-lg p-4">
          <p className="text-2xl font-bold text-navy-950">{new Set(classes.map((c) => c.section)).size}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sections</p>
        </div>
      </div>

      <div className="card rounded-lg p-5">
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading classes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/classes/${c.id}/attendance`)}
                className="text-left border border-gray-100 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-950 truncate">{c.subject_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.program} &middot; Section {c.section}</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0 text-brand-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-500">{c.student_count} students</span>
                  <span className="text-xs font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    <ClipboardCheck className="h-3.5 w-3.5" /> Take Attendance
                  </span>
                </div>
              </button>
            ))}
            {!classes.length && <p className="text-sm text-gray-400 col-span-2 text-center py-8">No classes assigned yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
