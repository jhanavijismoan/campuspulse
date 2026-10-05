const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('campuspulse_token');
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),

  // dashboard
  highlights: () => request('/dashboard/highlights'),

  // events
  events: (from, to) => request(`/events?from=${from}&to=${to}`),
  createEvent: (payload) => request('/events', { method: 'POST', body: payload }),
  updateEvent: (id, payload) => request(`/events/${id}`, { method: 'PUT', body: payload }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // notifications
  notifications: () => request('/notifications'),
  notificationCount: () => request('/notifications/count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  // internships
  internships: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/internships${qs ? `?${qs}` : ''}`);
  },
  createInternship: (payload) => request('/internships', { method: 'POST', body: payload }),
  applyToInternship: (id) => request(`/internships/${id}/apply`, { method: 'POST' }),

  // resume (used for internship matching)
  getResume: () => request('/resume'),
  deleteResume: () => request('/resume', { method: 'DELETE' }),
  uploadResume: async (file) => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/resume`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Upload failed with status ${res.status}`);
    return data;
  },

  // documents
  documents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/documents${qs ? `?${qs}` : ''}`);
  },
  createDocument: (payload) => request('/documents', { method: 'POST', body: payload }),
  // Real file upload — multipart/form-data, so it bypasses the JSON request() helper.
  uploadDocument: async ({ title, category, audience, file }) => {
    const token = getToken();
    const form = new FormData();
    form.append('title', title);
    if (category) form.append('category', category);
    if (audience) form.append('audience', audience);
    if (file) form.append('file', file);
    const res = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Upload failed with status ${res.status}`);
    return data;
  },
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  takeDownDocument: (id) => request(`/documents/${id}/takedown`, { method: 'PATCH' }),
  restoreDocument: (id) => request(`/documents/${id}/restore`, { method: 'PATCH' }),

  // CV Builder
  getCV: () => request('/cv'),
  generateCV: (payload) => request('/cv/generate', { method: 'POST', body: payload }),

  // announcements
  processAnnouncement: (raw_text) => request('/announcements/process', { method: 'POST', body: { raw_text } }),
  saveAnnouncement: (payload) => request('/announcements', { method: 'POST', body: payload }),
  announcements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/announcements${qs ? `?${qs}` : ''}`);
  },
  updateAnnouncement: (id, payload) => request(`/announcements/${id}`, { method: 'PATCH', body: payload }),
  deleteAnnouncement: (id) => request(`/announcements/${id}`, { method: 'DELETE' }),
  viewAnnouncement: (id) => request(`/announcements/${id}/view`, { method: 'POST' }),
  announcementStats: (id) => request(`/announcements/${id}/stats`),

  // calendar events (admin-broadcast)
  calendarEvents: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/calendar-events${qs ? `?${qs}` : ''}`);
  },
  createCalendarEvent: (payload) => request('/calendar-events', { method: 'POST', body: payload }),
  updateCalendarEvent: (id, payload) => request(`/calendar-events/${id}`, { method: 'PATCH', body: payload }),
  deleteCalendarEvent: (id) => request(`/calendar-events/${id}`, { method: 'DELETE' }),
  publishCalendarEvent: (id) => request(`/calendar-events/${id}/publish`, { method: 'POST' }),
  unpublishCalendarEvent: (id) => request(`/calendar-events/${id}/unpublish`, { method: 'POST' }),

  // analytics (admin)
  analyticsSummary: () => request('/analytics/summary'),

  // pulse ai
  aiSuggestions: () => request('/ai/suggestions'),
  askAi: (message, history) => request('/ai/ask', { method: 'POST', body: { message, history } }),
  aiStatus: () => request('/ai/status'),

  // admin teaching workflow
  classes: () => request('/classes'),
  classRoster: (id) => request(`/classes/${id}/roster`),
  classAttendance: (id, date) => request(`/classes/${id}/attendance?date=${date}`),
  saveAttendance: (id, payload) => request(`/classes/${id}/attendance`, { method: 'POST', body: payload }),
  pendingTasks: () => request('/pending-tasks'),
  createPendingTask: (payload) => request('/pending-tasks', { method: 'POST', body: payload }),
  updatePendingTask: (id, payload) => request(`/pending-tasks/${id}`, { method: 'PATCH', body: payload }),
  deletePendingTask: (id) => request(`/pending-tasks/${id}`, { method: 'DELETE' }),
  studentQueries: () => request('/student-queries'),
  myStudentQueries: () => request('/student-queries/mine'),
  submitStudentQuery: (payload) => request('/student-queries', { method: 'POST', body: payload }),
  updateStudentQuery: (id, payload) => request(`/student-queries/${id}`, { method: 'PATCH', body: payload }),
  draftQueryReply: (id) => request(`/student-queries/${id}/draft-reply`, { method: 'POST' }),
  generateQuiz: (payload) => request('/ai/generate-quiz', { method: 'POST', body: payload }),

  // student academic pages
  studentAttendance: () => request('/student/attendance'),
  studentTimetable: () => request('/student/timetable'),

  // search
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  // seating
  mySeating: () => request('/seating/me'),
  seatingHallChart: (sessionId) => request(`/seating/sessions/${sessionId}/hall-chart`),
  seatingMyDuties: () => request('/seating/my-duties'),
  seatingSessions: () => request('/seating/sessions'),
  seatingCreateSession: (payload) => request('/seating/sessions', { method: 'POST', body: payload }),
  seatingHalls: () => request('/seating/halls'),
  seatingCreateHall: (payload) => request('/seating/halls', { method: 'POST', body: payload }),
  seatingAllocations: (sessionId) => request(`/seating/sessions/${sessionId}/allocations`),
  seatingAllocate: (sessionId, payload) => request(`/seating/sessions/${sessionId}/allocate`, { method: 'POST', body: payload }),
  seatingMoveSeat: (assignmentId, payload) => request(`/seating/assignments/${assignmentId}/move`, { method: 'PATCH', body: payload }),
  seatingImportCsv: (sessionId, rows) => request(`/seating/sessions/${sessionId}/import-csv`, { method: 'POST', body: { rows } }),
  seatingPublish: (sessionId) => request(`/seating/sessions/${sessionId}/publish`, { method: 'POST' }),
  seatingUnpublish: (sessionId) => request(`/seating/sessions/${sessionId}/unpublish`, { method: 'POST' }),
  seatingDuties: (sessionId) => request(`/seating/sessions/${sessionId}/duties`),
  seatingAssignDuty: (sessionId, payload) => request(`/seating/sessions/${sessionId}/duties`, { method: 'POST', body: payload }),
};

export function setToken(token) {
  if (token) localStorage.setItem('campuspulse_token', token);
  else localStorage.removeItem('campuspulse_token');
}

export function getStoredToken() {
  return getToken();
}
