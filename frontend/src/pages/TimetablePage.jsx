import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Clock, MapPin, BookOpen, CalendarDays } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Fixed weekly timetable for demo (BBA Sem 3 Section C schedule)
const FIXED_TIMETABLE = [
  // [day (0=Mon), start, end, subject, room, type]
  [0, '09:00', '10:00', 'Business Communication', 'B204', 'class'],
  [0, '10:00', '11:00', 'Marketing Management', 'B204', 'class'],
  [0, '11:30', '12:30', 'Corporate Accounting', 'C301', 'class'],
  [1, '09:00', '10:00', 'English Language', 'B204', 'class'],
  [1, '10:00', '11:00', 'Business Communication', 'B204', 'class'],
  [1, '11:30', '12:30', 'Marketing Management', 'C301', 'class'],
  [2, '09:00', '10:00', 'Banking Law and Practice', 'B204', 'class'],
  [2, '10:00', '12:00', 'CIA 1 Exam', 'Hall B204', 'exam'],
  [2, '15:00', '16:00', 'Council Meeting', 'Auditorium', 'meeting'],
  [3, '09:00', '10:00', 'Corporate Accounting', 'C301', 'class'],
  [3, '10:00', '11:00', 'English Language', 'B204', 'class'],
  [3, '15:00', '16:00', 'Association Work', 'Campus', 'meeting'],
  [4, '09:00', '10:00', 'Marketing Management', 'B204', 'class'],
  [4, '10:00', '11:00', 'Banking Law and Practice', 'C301', 'class'],
  [4, '11:30', '12:30', 'Business Communication', 'B204', 'class'],
];

const TYPE_COLORS = {
  class: 'bg-brand-50 border-brand-300 text-brand-800',
  exam: 'bg-red-50 border-red-300 text-red-800',
  meeting: 'bg-amber-50 border-amber-300 text-amber-800',
};

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function TimetablePage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 || new Date().getDay() === 6 ? 0 : new Date().getDay() - 1);

  useEffect(() => {
    api.studentTimetable()
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  const dayEntries = FIXED_TIMETABLE
    .filter((e) => e[0] === selectedDay)
    .sort((a, b) => timeToMin(a[1]) - timeToMin(b[1]));

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-950">My Timetable</h1>
        <p className="text-sm text-gray-500 mt-1">
          Weekly class schedule · {classes.length > 0 ? `Enrolled in ${classes.length} subjects` : 'BBA Sem 3 Section C'}
        </p>
      </div>

      {/* Day picker */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
              selectedDay === i
                ? 'bg-brand-600 text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{DAY_SHORT[i]}</span>
          </button>
        ))}
      </div>

      {/* Schedule */}
      {dayEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No classes scheduled for {DAYS[selectedDay]}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEntries.map(([, start, end, subject, room, type], idx) => (
            <div key={idx} className={`bg-white rounded-xl p-4 border shadow-sm flex items-center gap-4 border-l-4 ${TYPE_COLORS[type] || TYPE_COLORS.class}`}>
              <div className="shrink-0 text-center w-16">
                <p className="text-sm font-semibold">{start}</p>
                <p className="text-xs text-gray-400">{end}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy-950 text-sm truncate">{subject}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                  {room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {room}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeToMin(end) - timeToMin(start)} min
                  </span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                type === 'exam' ? 'bg-red-100 text-red-700' :
                type === 'meeting' ? 'bg-amber-100 text-amber-700' :
                'bg-brand-100 text-brand-700'
              }`}>
                {type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Enrolled subjects */}
      {classes.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-navy-950 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-600" /> Enrolled Subjects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {classes.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <div className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                {c.subject_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
