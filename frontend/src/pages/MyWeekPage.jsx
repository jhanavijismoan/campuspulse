import { useEffect, useState } from 'react';
import { api } from '../api/client';
import MyWeek from '../components/MyWeek';
import { currentAcademicWeek } from '../utils/dates';

export default function MyWeekPage() {
  const [offset, setOffset] = useState(0);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const range = currentAcademicWeek(offset);

  useEffect(() => {
    setLoading(true);
    api
      .events(range.from, range.to)
      .then(setEvents)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy-950">My Week</h1>
          <p className="text-sm text-gray-500">{range.label}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            ← Previous
          </button>
          <button
            onClick={() => setOffset(0)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            This Week
          </button>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">Loading...</div>
      ) : (
        <MyWeek events={events} showFullLink={false} />
      )}
    </div>
  );
}
