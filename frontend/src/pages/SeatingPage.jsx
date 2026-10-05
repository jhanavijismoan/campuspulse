import { useEffect, useState } from 'react';
import { MapPin, Clock, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AdminSeating from '../components/AdminSeating';

// ── Hall chart ────────────────────────────────────────────────────────────────

function HallChart({ sessionId, studentId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    if (data) { setOpen((v) => !v); return; }
    try {
      const result = await api.seatingHallChart(sessionId);
      setData(result);
      setOpen(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={load}
        className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {open ? 'Hide hall chart' : 'View hall chart'}
      </button>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {open && data && data.charts.map((chart, ci) => (
        <div key={ci} className="mt-3 overflow-x-auto">
          <p className="text-xs font-medium text-gray-600 mb-2">{chart.hall.name}</p>
          <div className="inline-block border border-gray-200 rounded-xl p-3 bg-gray-50">
            {chart.grid.map((row, ri) => (
              <div key={ri} className="flex gap-1.5 mb-1.5">
                <span className="text-[10px] text-gray-400 w-5 text-right shrink-0 pt-1">R{ri + 1}</span>
                {row.map((cell, ci2) => {
                  const isMe = cell.occupied && cell.student_id === studentId;
                  return (
                    <div
                      key={ci2}
                      title={cell.occupied ? `${cell.full_name}${cell.roll_no ? ` (${cell.roll_no})` : ''}` : 'Empty'}
                      className={`h-7 w-7 rounded-md text-[10px] font-semibold flex items-center justify-center border transition
                        ${isMe
                          ? 'bg-brand-600 text-white border-brand-700 ring-2 ring-brand-400 ring-offset-1'
                          : cell.occupied
                            ? 'bg-gray-200 text-gray-600 border-gray-300'
                            : 'bg-white text-gray-300 border-dashed border-gray-200'
                        }`}
                    >
                      {cell.seat}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <div className="h-3.5 w-3.5 rounded bg-brand-600" /> Your seat
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <div className="h-3.5 w-3.5 rounded bg-gray-200 border border-gray-300" /> Occupied
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <div className="h-3.5 w-3.5 rounded bg-white border border-dashed border-gray-300" /> Empty
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Student view ──────────────────────────────────────────────────────────────

function StudentSeating() {
  const { user } = useAuth();
  const [seats, setSeats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.mySeating()
      .then(setSeats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card p-8 text-center text-sm text-gray-400">Loading your seating plan…</div>;
  if (error) return <div className="card p-8 text-center text-sm text-red-500">{error}</div>;
  if (!seats?.length) {
    return (
      <div className="card p-8 text-center">
        <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600">No seating plan published yet</p>
        <p className="text-xs text-gray-400 mt-1">Your seating plan will appear here once your teacher publishes it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {seats.map((seat) => {
        const examDate = seat.exam_date
          ? new Date(seat.exam_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : null;

        return (
          <div key={seat.id} className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-semibold text-navy-950 text-base">{seat.session_title}</h2>
                {examDate && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {examDate}
                  </div>
                )}
                {seat.start_time && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    {seat.start_time} – {seat.end_time}
                  </div>
                )}
              </div>
              <span className="shrink-0 text-[10px] font-semibold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                PUBLISHED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-center">
                <p className="text-[10px] font-medium text-brand-600 uppercase tracking-wide mb-1">Hall</p>
                <p className="font-bold text-brand-800 text-sm">{seat.hall_name}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Row</p>
                <p className="font-bold text-navy-950 text-sm">{seat.row_number}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Seat</p>
                <p className="font-bold text-navy-950 text-sm">{seat.seat_number}</p>
              </div>
              {seat.roll_no && (
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Roll No</p>
                  <p className="font-bold text-navy-950 text-sm">{seat.roll_no}</p>
                </div>
              )}
            </div>

            <HallChart sessionId={seat.session_id} studentId={user?.id} />

            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Report to your hall 10 minutes before the exam starts.</p>
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Bring your hall ticket and a valid ID.</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function SeatingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">
          {user?.role === 'admin' ? 'Seating & Invigilation' : 'Seating Plan'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {user?.role === 'admin'
            ? 'Manage exam sessions, halls, seat allocations, and invigilation duties.'
            : 'Your exam seat assignments for upcoming sessions.'}
        </p>
      </div>

      {user?.role === 'admin' ? <AdminSeating /> : <StudentSeating />}
    </div>
  );
}
