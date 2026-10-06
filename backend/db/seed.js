/**
 * CampusPulse seed — single comprehensive setup script.
 * Creates all demo data: university, users, classes (BBA Sem 3C), roster,
 * attendance records, timetable slots, CIA marks, events, internships,
 * documents, notifications, announcements, seating, and admin data.
 *
 * Run after schema + migrations: node db/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

// Weekday date builder: offsets from current-week Monday (0=Mon..4=Fri).
// Anchored on the coming Wednesday so demo events always sit in the near future.
function weekdayDate(offsetFromMonday, hour = 9, minute = 0) {
  const now = new Date();
  const day = now.getDay();
  const daysUntilWed = ((3 - day) + 7) % 7;
  const wed = new Date(now);
  wed.setDate(now.getDate() + daysUntilWed);
  const mon = new Date(wed);
  mon.setDate(wed.getDate() - 2);
  const target = new Date(mon);
  target.setDate(mon.getDate() + offsetFromMonday);
  target.setHours(hour, minute, 0, 0);
  return target.toISOString();
}

// Past date helper: daysAgo from today
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// 53-student BBA Sem 3C roster (canonical roll numbers + names)
const BBA_3C_ROSTER = [
  { roll: 'MB257201', name: 'A LOHITH CHOWDARY',           studentId: null },
  { roll: 'MB257202', name: 'AANYA GUPTA',                  studentId: null },
  { roll: 'MB257203', name: 'AFEEFA SAMEER',                studentId: null },
  { roll: 'MB257205', name: 'AGRIMA VAISH',                 studentId: null },
  { roll: 'MB257206', name: 'AKSHAYA S',                    studentId: null },
  { roll: 'MB257207', name: 'ANAGANI KAMALA SHRITA',        studentId: null },
  { roll: 'MB257208', name: 'ANISH K HIRMUTT',              studentId: null },
  { roll: 'MB257209', name: 'ANJALI KARNAWAT',              studentId: null },
  { roll: 'MB257210', name: 'ANUSHKAA DWIVEDI',             studentId: null },
  { roll: 'MB257211', name: 'BHUMI SHAHDEO',                studentId: null },
  { roll: 'MB257212', name: 'CINDERELLA.K',                 studentId: null },
  { roll: 'MB257213', name: 'DHANUSH RAJ A',                studentId: null },
  { roll: 'MB257215', name: 'DISHA RAJ',                    studentId: null },
  { roll: 'MB257216', name: 'DIVYANSHI',                    studentId: null },
  { roll: 'MB257217', name: 'ESHA UDESHI',                  studentId: null },
  { roll: 'MB257218', name: 'ESHAN RORIA',                  studentId: null },
  { roll: 'MB257220', name: 'HARSHINI ADITYA AALAVANDAR',   studentId: null },
  { roll: 'MB257221', name: 'HURAIN MALIK',                 studentId: null },
  { roll: 'MB257222', name: 'JHANAVI JISMOAN CHALAKKEL',    studentId: 'JHANAVI' }, // linked to jhanavi user
  { roll: 'MB257223', name: 'AAMINA ARHAM',                 studentId: null },
  { roll: 'MB257225', name: 'KANISHKA SEN',                 studentId: null },
  { roll: 'MB257226', name: 'KASHVI BALAJI',                studentId: null },
  { roll: 'MB257228', name: 'KRISHI RAI',                   studentId: null },
  { roll: 'MB257231', name: 'KUSHITHA YM',                  studentId: null },
  { roll: 'MB257232', name: 'LAVINIA DKHAR',                studentId: null },
  { roll: 'MB257233', name: 'LEHYA.B',                      studentId: null },
  { roll: 'MB257234', name: 'MADIHA RAMEEN',                studentId: null },
  { roll: 'MB257235', name: 'MAHEK NILANCHAL PADHY',        studentId: null },
  { roll: 'MB257236', name: 'MANAN P GANDHI',               studentId: null },
  { roll: 'MB257237', name: 'MANISHA CHOUDHARY B',          studentId: null },
  { roll: 'MB257239', name: 'MOUSUMI SINGH',                studentId: null },
  { roll: 'MB257240', name: 'NAVSHEEN SHAIKH KHALANDAR',    studentId: null },
  { roll: 'MB257242', name: 'NIHAR P MALI',                 studentId: null },
  { roll: 'MB257244', name: 'PRATHIKSHA.H',                 studentId: null },
  { roll: 'MB257245', name: 'PRATHIKSHA P',                 studentId: null },
  { roll: 'MB257246', name: 'PUESH AGARWAL',                studentId: null },
  { roll: 'MB257247', name: 'RABJOT KAUR',                  studentId: null },
  { roll: 'MB257248', name: 'RISHIKA LOKESH',               studentId: null },
  { roll: 'MB257249', name: 'ROHITH P',                     studentId: null },
  { roll: 'MB257251', name: 'SHATABDI RASAILY',             studentId: null },
  { roll: 'MB257252', name: 'SHIVAM SINGH',                 studentId: null },
  { roll: 'MB257253', name: 'SIRI PATRO',                   studentId: null },
  { roll: 'MB257254', name: 'SONALI M',                     studentId: null },
  { roll: 'MB257255', name: 'SRRIEWERSHUN KM',              studentId: null },
  { roll: 'MB257256', name: 'SYED ZAMAN',                   studentId: null },
  { roll: 'MB257257', name: 'TIA LANCELOT DSOUZA',          studentId: null },
  { roll: 'MB257258', name: 'UDDIPTA BARUAH',               studentId: null },
  { roll: 'MB257259', name: 'YASHASWI TOMAR',               studentId: null },
  { roll: 'MB257260', name: 'YOIHENBA WAIKHOM',             studentId: null },
  { roll: 'MB257262', name: 'PRIANSHI SINGH',               studentId: null },
  { roll: 'MB257263', name: 'KURELLA SOWMYA PRIYA',         studentId: null },
  { roll: 'MB257265', name: 'RIYA',                         studentId: null },
  { roll: 'MB257267', name: 'ANDREWS VIJAY',                studentId: null },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Clearing existing data...');
    // timetable_slots and cia_marks may not exist yet — handle gracefully
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name='timetable_slots') THEN
          TRUNCATE timetable_slots;
        END IF;
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name='cia_marks') THEN
          TRUNCATE cia_marks;
        END IF;
      END $$;
    `);
    await client.query(`
      TRUNCATE ai_queries, admin_insights, attendance_records, class_students,
      pending_tasks, student_queries, classes, deadlines, documents,
      internship_applications, internships, notifications, announcements,
      events, seat_assignments, invigilation_duties, exam_halls, exam_sessions,
      users, universities RESTART IDENTITY CASCADE
    `);

    // ── University ──────────────────────────────────────────────────────────────
    console.log('Creating university...');
    const { rows: [uni] } = await client.query(
      `INSERT INTO universities (name, logo_url) VALUES ($1, $2) RETURNING id`,
      ['Mount Carmel (Deemed to be) University', null]
    );

    // ── Users ──────────────────────────────────────────────────────────────────
    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const { rows: [jhanavi] } = await client.query(
      `INSERT INTO users (university_id, full_name, email, password_hash, role, program, semester, section, avatar_url)
       VALUES ($1,'Jhanavi','jhanavi@mountcarmel.edu',$2,'student','BBA','Sem 3','Section C',null) RETURNING id, full_name`,
      [uni.id, passwordHash]
    );

    const { rows: [admin] } = await client.query(
      `INSERT INTO users (university_id, full_name, email, password_hash, role, program, semester, section)
       VALUES ($1,'Dr. Adlene Portia Cardoza','admin@mountcarmel.edu',$2,'admin','School of Commerce',null,null) RETURNING id`,
      [uni.id, passwordHash]
    );

    const extraStudentSeeds = [
      ['Ananya Rao',  'ananya@mountcarmel.edu', 'BBA', 'Sem 3', 'Section C'],
      ['Diya Menon',  'diya@mountcarmel.edu',   'BBA', 'Sem 3', 'Section C'],
      ['Meera Iyer',  'meera@mountcarmel.edu',  'BCom','Sem 3', 'Section B'],
      ['Rhea Thomas', 'rhea@mountcarmel.edu',   'BBA', 'Sem 3', 'Section C'],
      ['Sara Dsouza', 'sara@mountcarmel.edu',   'BCom','Sem 5', 'Section A'],
      ['Tara Nair',   'tara@mountcarmel.edu',   'BBA', 'Sem 3', 'Section C'],
    ];
    const extraStudents = [];
    for (const [name, email, program, semester, section] of extraStudentSeeds) {
      const { rows: [s] } = await client.query(
        `INSERT INTO users (university_id, full_name, email, password_hash, role, program, semester, section)
         VALUES ($1,$2,$3,$4,'student',$5,$6,$7) RETURNING id, full_name`,
        [uni.id, name, email, passwordHash, program, semester, section]
      );
      extraStudents.push(s);
    }

    // ── Events (student: My Week / Highlights) ─────────────────────────────────
    console.log('Creating student events...');
    const studentEvents = [
      { title: 'Banking Law and Practice Assignment',  type: 'assignment',  date: weekdayDate(0, 18, 0), status: 'upcoming',  action_url: '/my-week' },
      { title: 'CEE Course',                           type: 'class',       date: weekdayDate(0,  6, 30), status: 'upcoming',  action_url: '/timetable' },
      { title: 'Business Communication Presentation',  type: 'presentation',date: weekdayDate(1, 10, 0), status: 'upcoming',  action_url: '/my-week' },
      { title: 'Blue Book Submission',                 type: 'assignment',  date: weekdayDate(1, 23, 59), status: 'due_soon',  action_url: '/my-week', description: 'End of Day' },
      { title: 'CIA 1 Exam',                           type: 'exam',        date: weekdayDate(2, 10, 0),  status: 'urgent',   action_url: '/seating', action_label: 'View Seating Plan', description: 'Business Communication', location: 'B204' },
      { title: 'View Seating Plan Before Exam',        type: 'assignment',  date: weekdayDate(2,  9, 0),  status: 'urgent',   action_url: '/seating', action_label: 'View Seating Plan' },
      { title: 'English Language Assignment',          type: 'assignment',  date: weekdayDate(3, 18, 0), status: 'upcoming',  action_url: '/my-week' },
      { title: 'Association Work',                     type: 'meeting',     date: weekdayDate(3, 15, 0), status: 'upcoming',  action_url: '/calendar', description: '3:00 PM' },
      { title: 'Corporate Accounting Assignment',      type: 'assignment',  date: weekdayDate(4, 18, 0), status: 'due_soon',  action_url: '/my-week' },
      { title: 'Marketing Management Presentation',    type: 'presentation',date: weekdayDate(4, 23, 59), status: 'due_soon', action_url: '/my-week', action_label: 'View Task', description: 'End of Day' },
    ];
    for (const e of studentEvents) {
      await client.query(
        `INSERT INTO events (user_id, title, event_type, description, location, starts_at, status, action_label, action_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [jhanavi.id, e.title, e.type, e.description || null, e.location || null, e.date, e.status, e.action_label || null, e.action_url || null]
      );
    }
    // Council meeting
    await client.query(
      `INSERT INTO events (user_id, title, event_type, description, location, starts_at, status, action_label, action_url)
       VALUES ($1,'Council Meeting','meeting','Time: 3:00 PM','Auditorium',$2,'upcoming','View Calendar','/calendar')`,
      [jhanavi.id, weekdayDate(2, 15, 0)]
    );

    const adminEvents = [
      ['Business Communication', 'class', 'II BBA Section C', 'Classroom 204', weekdayDate(2, 10, 0), weekdayDate(2, 11, 0)],
      ['Corporate Accounting', 'class', 'II BCom Section B', 'Classroom 301', weekdayDate(2, 11, 30), weekdayDate(2, 12, 30)],
      ['Student Queries Review', 'meeting', 'End of Day', 'Staff Room', weekdayDate(4, 16, 0), weekdayDate(4, 17, 0)],
    ];
    for (const [title, type, description, location, starts, ends] of adminEvents) {
      await client.query(
        `INSERT INTO events (user_id, title, event_type, description, location, starts_at, ends_at, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'upcoming')`,
        [admin.id, title, type, description, location, starts, ends]
      );
    }

    // ── Notifications ──────────────────────────────────────────────────────────
    console.log('Creating notifications...');
    const studentNotifs = [
      ['CIA 1 Seating Released', 'Your seating for CIA 1 has been published. Hall B204, Row 3, Seat 4.', 'info'],
      ['Assignment Reminder', 'Blue Book submission is due today by end of day.', 'warning'],
      ['Holiday Notice', 'The college will remain closed on Friday for the university sports meet.', 'info'],
    ];
    for (const [title, body, severity] of studentNotifs) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, severity) VALUES ($1,$2,$3,$4)`,
        [jhanavi.id, title, body, severity]
      );
    }
    const adminNotifications = [
      ['Pending Tasks', '3 pending admin tasks require attention.', 'warning'],
      ['Student Queries', '4 unanswered student queries this week.', 'info'],
      ['Seating Published', 'CIA 1 seating plan has been published for BBA Semester 3.', 'success'],
    ];
    for (const [title, body, severity] of adminNotifications) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, severity) VALUES ($1,$2,$3,$4)`,
        [admin.id, title, body, severity]
      );
    }

    // ── Announcements ──────────────────────────────────────────────────────────
    console.log('Creating announcements...');
    await client.query(
      `INSERT INTO announcements (university_id, raw_text, title, audience, body, action, scheduled_at, priority, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [uni.id, 'CIA 1 seating published', 'CIA 1 Seating Plan Published', 'BBA Semester 3', 'Seating plan for CIA 1 is now available.', 'View Seating', weekdayDate(2, 9, 0), 'High', 'published', admin.id]
    );
    const announcements = [
      ['Holiday Notice', 'All Students', 'College holiday on Friday for university sports meet.', 'published', weekdayDate(0, 8, 0), 'Low'],
      ['Internal Assessment Guidelines', 'BBA Semester 3', 'Please follow the blue book submission guidelines.', 'published', weekdayDate(1, 9, 0), 'Medium'],
      ['Library Timings Update', 'All Students', 'The library will remain open till 8 PM on weekdays.', 'draft', null, 'Low'],
    ];
    for (const [title, audience, body, status, scheduledAt, priority] of announcements) {
      await client.query(
        `INSERT INTO announcements (university_id, raw_text, title, audience, body, action, scheduled_at, priority, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uni.id, body, title, audience, body, 'Review details', scheduledAt, priority, status, admin.id]
      );
    }

    // ── Documents ──────────────────────────────────────────────────────────────
    console.log('Creating documents...');
    const documents = [
      ['CIA 1 Seating Plan', 'Exam', 'BBA Semester 3'],
      ['Blue Book Submission Guidelines', 'Academic', 'All Students'],
      ['Internship NOC Form', 'Forms', 'All Students'],
      ['Library E-Resources Guide', 'Library', 'All Students'],
      ['College Holiday Calendar', 'Administrative', 'All Students'],
    ];
    for (const [title, category, audience] of documents) {
      const updated = new Date(); updated.setDate(updated.getDate() - Math.floor(Math.random() * 14));
      await client.query(
        `INSERT INTO documents (university_id, title, category, audience, file_url, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [uni.id, title, category, audience, `/files/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, updated]
      );
    }

    // ── Internships ────────────────────────────────────────────────────────────
    console.log('Creating internships...');
    const today = new Date();
    const internships = [
      { role_title: 'Marketing Intern', company: 'Brand Spark Pvt Ltd', mode: 'Hybrid', stipend_amount: 8000, deadline: daysAgo(-14), tags: ['marketing','social media','communication'], requirements: 'Strong communication skills, knowledge of social media platforms.', description: 'Assist the marketing team with campaigns and social media management.' },
      { role_title: 'Finance Analyst Intern', company: 'Pinnacle Capital', mode: 'On-site', stipend_amount: 12000, deadline: daysAgo(-21), tags: ['finance','accounting','excel'], requirements: 'Good understanding of corporate accounting and financial statements.', description: 'Support the finance team with data analysis and reporting.' },
      { role_title: 'HR Intern', company: 'TalentBridge Solutions', mode: 'Remote', stipend_amount: 6000, deadline: daysAgo(-10), tags: ['hr','recruitment','communication'], requirements: 'Good communication skills and interest in human resources.', description: 'Assist with recruitment and onboarding processes.' },
      { role_title: 'Business Development Intern', company: 'GrowthWave Technologies', mode: 'Hybrid', stipend_amount: 10000, deadline: daysAgo(-30), tags: ['business development','sales','communication','marketing'], requirements: 'Proactive, strong communication and presentation skills.', description: 'Support the BD team in identifying and onboarding new clients.' },
    ];
    const internshipIds = [];
    for (const i of internships) {
      const { rows: [intr] } = await client.query(
        `INSERT INTO internships (university_id, role_title, company_name, work_mode, stipend_amount, application_deadline, tags, requirements, description, published, published_at, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,now(),$10) RETURNING id`,
        [uni.id, i.role_title, i.company, i.mode, i.stipend_amount, i.deadline, i.tags, i.requirements, i.description, admin.id]
      );
      internshipIds.push(intr.id);
    }

    // ── Classes (BBA Sem 3C — canonical) ───────────────────────────────────────
    console.log('Creating BBA Sem 3C classes...');
    const classDefs = [
      { name: 'Intermediate French Level-1',               type: 'Theory' },
      { name: 'Banking Law and Practice',                   type: 'Theory' },
      { name: 'Marketing Management',                       type: 'Theory' },
      { name: 'Corporate Accounting',                       type: 'Theory' },
      { name: 'Business Communication',                     type: 'Theory' },
      { name: 'General English - Esperanza - Aspiring Hope',type: 'Theory' },
      { name: 'Information Technology for Managers',        type: 'Theory' },
    ];
    const classMap = {}; // subject_name → { id, csIdForJhanavi }
    for (const def of classDefs) {
      const { rows: [klass] } = await client.query(
        `INSERT INTO classes (teacher_id, subject_name, program, section, semester, attendance_type, student_count)
         VALUES ($1,$2,'BBA','C','Sem 3',$3,53) RETURNING id`,
        [admin.id, def.name, def.type]
      );
      classMap[def.name] = { id: klass.id, csIdForJhanavi: null };
    }

    // ── Class Students (53-student roster per class) ───────────────────────────
    console.log('Inserting 53-student roster for each class...');
    const csIdMap = {}; // `${classId}_${roll}` → class_student.id
    for (const def of classDefs) {
      const classId = classMap[def.name].id;
      for (const student of BBA_3C_ROSTER) {
        const linkedId = student.studentId === 'JHANAVI' ? jhanavi.id : null;
        const { rows: [cs] } = await client.query(
          `INSERT INTO class_students (class_id, student_id, roll_no, full_name)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [classId, linkedId, student.roll, student.name]
        );
        csIdMap[`${classId}_${student.roll}`] = cs.id;
        if (student.studentId === 'JHANAVI') classMap[def.name].csIdForJhanavi = cs.id;
      }
    }

    // ── Attendance Records for Jhanavi ──────────────────────────────────────────
    console.log('Creating attendance records for Jhanavi...');
    // Target: French 25/26, Banking 19/22, Marketing 25/27, Accounting 26/28, BizComm 28/30, GenEng 17/19, IT 15/15
    const attendancePlan = [
      { subj: 'Intermediate French Level-1',               conducted: 26, present: 25 },
      { subj: 'Banking Law and Practice',                   conducted: 22, present: 19 },
      { subj: 'Marketing Management',                       conducted: 27, present: 25 },
      { subj: 'Corporate Accounting',                       conducted: 28, present: 26 },
      { subj: 'Business Communication',                     conducted: 30, present: 28 },
      { subj: 'General English - Esperanza - Aspiring Hope',conducted: 19, present: 17 },
      { subj: 'Information Technology for Managers',        conducted: 15, present: 15 },
    ];
    for (const plan of attendancePlan) {
      const classId = classMap[plan.subj].id;
      const csId    = classMap[plan.subj].csIdForJhanavi;
      if (!csId) continue;
      // Scatter absences: absent on sessions at indices where (i % spacer == 0)
      const absentCount = plan.conducted - plan.present;
      const absentIndices = new Set();
      if (absentCount > 0) {
        const spacing = Math.floor(plan.conducted / (absentCount + 1));
        for (let a = 0; a < absentCount; a++) {
          absentIndices.add(Math.min(plan.conducted - 1, (a + 1) * spacing));
        }
      }
      for (let i = 0; i < plan.conducted; i++) {
        const dateStr = daysAgo((plan.conducted - i) * 2);
        const status  = absentIndices.has(i) ? 'absent' : 'present';
        await client.query(
          `INSERT INTO attendance_records (class_id, class_student_id, attendance_date, status, marked_by)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [classId, csId, dateStr, status, admin.id]
        );
      }
    }

    // ── Pending Tasks ──────────────────────────────────────────────────────────
    console.log('Creating admin pending tasks...');
    const mktgId    = classMap['Marketing Management'].id;
    const bizcommId = classMap['Business Communication'].id;
    const bankingId = classMap['Banking Law and Practice'].id;
    const taskSeeds = [
      ['Review Marketing Management Presentations', mktgId,    weekdayDate(4, 0, 0).slice(0, 10), 'High'],
      ['Approve CIA Seating Plan',                  bizcommId, weekdayDate(2, 0, 0).slice(0, 10), 'Medium'],
      ['Evaluate Blue Books',                       bizcommId, weekdayDate(4, 0, 0).slice(0, 10), 'High'],
      ['Prepare Student Guidelines',                bizcommId, weekdayDate(3, 0, 0).slice(0, 10), 'Medium'],
      ['Upload Study Material - Central Banking & RBI', bankingId, weekdayDate(4, 0, 0).slice(0, 10), 'Low'],
    ];
    for (const [title, classId, due, priority] of taskSeeds) {
      await client.query(
        `INSERT INTO pending_tasks (admin_id, class_id, title, due_date, priority) VALUES ($1,$2,$3,$4,$5)`,
        [admin.id, classId, title, due, priority]
      );
    }

    // ── Student Queries ────────────────────────────────────────────────────────
    const querySeeds = [
      [jhanavi.id,        bizcommId, 'CIA seating plan',         'Where can I find my CIA seating plan?'],
      [extraStudents[0].id, mktgId, 'Presentation submission',   'Should we upload slides as PDF or PPT?'],
      [extraStudents[1].id, bizcommId, 'Blue Book',              'Can I submit the Blue Book tomorrow morning?'],
      [extraStudents[2].id, classMap['Corporate Accounting'].id, 'Accounting assignment', 'Is goodwill valuation included in the test?'],
    ];
    for (const [studentId, classId, subject, message] of querySeeds) {
      await client.query(
        `INSERT INTO student_queries (admin_id, student_id, class_id, subject, message) VALUES ($1,$2,$3,$4,$5)`,
        [admin.id, studentId, classId, subject, message]
      );
    }

    // ── Admin Analytics ────────────────────────────────────────────────────────
    console.log('Creating admin analytics data...');
    const deadlines = [
      ['CIA Seating Plan Check', weekdayDate(2, 0, 0).slice(0, 10), 'High', 452],
      ['Marketing Management Presentation', weekdayDate(4, 0, 0).slice(0, 10), 'High', 318],
      ['Blue Book Submission', weekdayDate(1, 0, 0).slice(0, 10), 'Medium', 265],
    ];
    for (const [title, due, priority, affected] of deadlines) {
      await client.query(
        `INSERT INTO deadlines (university_id, title, due_date, priority, affected_students) VALUES ($1,$2,$3,$4,$5)`,
        [uni.id, title, due, priority, affected]
      );
    }
    for (const [text, count] of [['CIA seating plan', 254], ['Blue Book submission', 198], ['Internship NOC procedure', 176]]) {
      await client.query(`INSERT INTO ai_queries (university_id, query_text, hit_count) VALUES ($1,$2,$3)`, [uni.id, text, count]);
    }
    await client.query(
      `INSERT INTO admin_insights (university_id, insight_text) VALUES ($1,$2)`,
      [uni.id, 'Students are frequently searching for Blue Book submission guidelines. Consider pinning the document.']
    );

    // ── Seating / Exam Module ──────────────────────────────────────────────────
    console.log('Creating seating data...');
    const { rows: [hallB204] } = await client.query(
      `INSERT INTO exam_halls (university_id, name, capacity, rows, seats_per_row) VALUES ($1,'Hall B204',30,5,6) RETURNING id`,
      [uni.id]
    );
    const { rows: [hallSeminar] } = await client.query(
      `INSERT INTO exam_halls (university_id, name, capacity, rows, seats_per_row) VALUES ($1,'Seminar Hall 1',24,4,6) RETURNING id`,
      [uni.id]
    );
    const ciaDate = new Date(weekdayDate(2, 10, 0));
    const { rows: [cia1] } = await client.query(
      `INSERT INTO exam_sessions (university_id, title, exam_date, start_time, end_time, program, semester, published, published_at, created_by)
       VALUES ($1,'CIA 1 — BBA Semester 3',$2,'10:00','12:00','BBA',3,true,now(),$3) RETURNING id`,
      [uni.id, ciaDate.toISOString().slice(0, 10), admin.id]
    );
    const nextWeek = new Date(ciaDate); nextWeek.setDate(ciaDate.getDate() + 7);
    await client.query(
      `INSERT INTO exam_sessions (university_id, title, exam_date, start_time, end_time, program, semester, published, created_by)
       VALUES ($1,'CIA 2 — BBA Semester 3',$2,'10:00','12:00','BBA',3,false,$3)`,
      [uni.id, nextWeek.toISOString().slice(0, 10), admin.id]
    );

    // Seat assignments
    const allStudents = [jhanavi, ...extraStudents];
    const seatPlan = [
      { student: jhanavi,           row: 3, seat: 4 },
      { student: extraStudents[0],  row: 1, seat: 1 },
      { student: extraStudents[1],  row: 1, seat: 2 },
      { student: extraStudents[2],  row: 2, seat: 1 },
      { student: extraStudents[3],  row: 2, seat: 2 },
      { student: extraStudents[4],  row: 4, seat: 1 },
      { student: extraStudents[5],  row: 4, seat: 2 },
    ];
    for (const { student, row, seat } of seatPlan) {
      const { rows: csRows } = await client.query(
        `SELECT roll_no FROM class_students WHERE student_id = $1 LIMIT 1`, [student.id]
      );
      await client.query(
        `INSERT INTO seat_assignments (session_id, hall_id, student_id, row_number, seat_number, roll_no)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [cia1.id, hallB204.id, student.id, row, seat, csRows[0]?.roll_no || null]
      );
    }
    await client.query(
      `INSERT INTO invigilation_duties (session_id, hall_id, admin_id, duty_role) VALUES ($1,$2,$3,'chief_invigilator')`,
      [cia1.id, hallB204.id, admin.id]
    );
    await client.query(
      `INSERT INTO invigilation_duties (session_id, hall_id, admin_id, duty_role) VALUES ($1,$2,$3,'invigilator')`,
      [cia1.id, hallSeminar.id, admin.id]
    );

    // Shared class ID shorthands (used by both timetable and CIA marks)
    const french  = classMap['Intermediate French Level-1'].id;
    const banking = classMap['Banking Law and Practice'].id;
    const mktg    = classMap['Marketing Management'].id;
    const acct    = classMap['Corporate Accounting'].id;
    const bizcomm = classMap['Business Communication'].id;
    const eng     = classMap['General English - Esperanza - Aspiring Hope'].id;
    const it      = classMap['Information Technology for Managers'].id;

    // ── Timetable Slots (if table exists) ──────────────────────────────────────
    const { rows: [tblCheck] } = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='timetable_slots') AS exists`
    );
    if (tblCheck.exists) {
      console.log('Creating timetable slots...');
      const slots = [
        [bizcomm, 0, '09:00', '10:00', 'B204', 'class'],
        [mktg,    0, '10:00', '11:00', 'B204', 'class'],
        [acct,    0, '11:30', '12:30', 'C301', 'class'],
        [eng,     1, '09:00', '10:00', 'B204', 'class'],
        [bizcomm, 1, '10:00', '11:00', 'B204', 'class'],
        [mktg,    1, '11:30', '12:30', 'C301', 'class'],
        [banking, 2, '09:00', '10:00', 'B204', 'class'],
        [acct,    3, '09:00', '10:00', 'C301', 'class'],
        [eng,     3, '10:00', '11:00', 'B204', 'class'],
        [mktg,    4, '09:00', '10:00', 'B204', 'class'],
        [banking, 4, '10:00', '11:00', 'C301', 'class'],
        [bizcomm, 4, '11:30', '12:30', 'B204', 'class'],
      ];
      for (const [classId, dow, start, end, room, type] of slots) {
        await client.query(
          `INSERT INTO timetable_slots (class_id, day_of_week, start_time, end_time, room, slot_type)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [classId, dow, start, end, room, type]
        );
      }
    }

    // ── CIA Marks (if table exists) ─────────────────────────────────────────────
    const { rows: [ciaCheck] } = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='cia_marks') AS exists`
    );
    if (ciaCheck.exists) {
      console.log('Creating CIA marks...');
      // Published CIA 1 marks for jhanavi and 4 extra BBA C students
      const ciaStudents = [
        { userId: jhanavi.id,         marks: [23, 21, 19, 22, 20] },
        { userId: extraStudents[0].id, marks: [22, 20, 21, 24, 18] },
        { userId: extraStudents[1].id, marks: [20, 23, 22, 19, 21] },
        { userId: extraStudents[3].id, marks: [24, 22, 23, 20, 19] }, // Rhea
        { userId: extraStudents[5].id, marks: [18, 19, 17, 21, 16] }, // Tara
      ];
      const ciaSubjects = [bizcomm, mktg, acct, eng, banking];
      for (const { userId, marks } of ciaStudents) {
        for (let i = 0; i < ciaSubjects.length; i++) {
          await client.query(
            `INSERT INTO cia_marks (class_id, student_id, cia_number, marks_obtained, max_marks, published)
             VALUES ($1,$2,1,$3,25,true) ON CONFLICT DO NOTHING`,
            [ciaSubjects[i], userId, marks[i]]
          );
        }
      }
    }

    // ── Calendar Events ────────────────────────────────────────────────────────
    const { rows: [calCheck] } = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='calendar_events') AS exists`
    );
    if (calCheck.exists) {
      console.log('Creating calendar events...');
      const calEvents = [
        ['CIA 1 Examination', 'BBA Semester 3', 'Exam — Business Communication, Hall B204', weekdayDate(2, 10, 0), weekdayDate(2, 12, 0)],
        ['Sports Day', 'All', 'Annual university sports meet. College holiday.', weekdayDate(4, 9, 0), weekdayDate(4, 17, 0)],
        ['Internship Orientation', 'BBA Semester 3', 'Career services orientation for internship applicants.', weekdayDate(3, 14, 0), weekdayDate(3, 16, 0)],
      ];
      for (const [title, audience, description, start, end] of calEvents) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const eventDate = startDate.toISOString().slice(0, 10);
        const startTime = startDate.toISOString().slice(11, 16); // HH:MM
        const endTime   = endDate.toISOString().slice(11, 16);
        await client.query(
          `INSERT INTO calendar_events (university_id, title, audience, description, event_date, start_time, end_time, published, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)
           ON CONFLICT DO NOTHING`,
          [uni.id, title, audience, description, eventDate, startTime, endTime, admin.id]
        );
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed complete.');
    console.log('   Student: jhanavi@mountcarmel.edu / password123');
    console.log('   Admin:   admin@mountcarmel.edu / password123\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
