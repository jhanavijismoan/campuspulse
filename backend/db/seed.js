/**
 * Seeds the campuspulse database with data that mirrors the product mockup:
 * Jhanavi (BBA, Sem 3, Section C) at Mount Carmel (Deemed to be) University.
 *
 * Run with: node db/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

// Build a date string for a given weekday offset (0=Mon..4=Fri) in the CURRENT week,
// at a given hour/minute, so the seeded week always lines up with "today" when demoed.
function weekdayDate(offsetFromMonday, hour = 9, minute = 0) {
  // Anchor on the next Wednesday (today counts if it IS Wednesday), so the
  // seeded exam/highlight events always sit in the future relative to "now",
  // regardless of which day the seed script happens to run on.
  const now = new Date();
  const day = now.getDay(); // 0 = Sun ... 6 = Sat
  const daysUntilWednesday = ((3 - day) + 7) % 7; // 3 = Wednesday
  const wednesday = new Date(now);
  wednesday.setDate(now.getDate() + daysUntilWednesday);
  const monday = new Date(wednesday);
  monday.setDate(wednesday.getDate() - 2);

  const target = new Date(monday);
  target.setDate(monday.getDate() + offsetFromMonday);
  target.setHours(hour, minute, 0, 0);
  return target.toISOString();
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Clearing existing data...');
    await client.query(`
      TRUNCATE ai_queries, admin_insights, attendance_records, class_students,
      pending_tasks, student_queries, classes, deadlines, documents,
      internship_applications, internships, notifications, announcements,
      events, seat_assignments, invigilation_duties, exam_halls, exam_sessions,
      users, universities RESTART IDENTITY CASCADE
    `);

    console.log('Creating university...');
    const { rows: [uni] } = await client.query(
      `INSERT INTO universities (name, logo_url) VALUES ($1, $2) RETURNING id`,
      ['Mount Carmel (Deemed to be) University', null]
    );

    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const { rows: [jhanavi] } = await client.query(
      `INSERT INTO users (university_id, full_name, email, password_hash, role, program, semester, section, avatar_url)
       VALUES ($1,$2,$3,$4,'student',$5,$6,$7,$8) RETURNING id, full_name`,
      [uni.id, 'Jhanavi', 'jhanavi@mountcarmel.edu', passwordHash, 'BBA', 'Sem 3', 'Section C', null]
    );

    const { rows: [admin] } = await client.query(
      `INSERT INTO users (university_id, full_name, email, password_hash, role, program, semester, section)
       VALUES ($1,$2,$3,$4,'admin',$5,$6,$7) RETURNING id`,
      [uni.id, 'Dr. Adlene Portia Cardoza', 'admin@mountcarmel.edu', passwordHash, 'School of Commerce', null, null]
    );

    const studentSeeds = [
      ['Ananya Rao', 'ananya@mountcarmel.edu', 'BBA', 'Sem 3', 'Section C'],
      ['Diya Menon', 'diya@mountcarmel.edu', 'BBA', 'Sem 3', 'Section C'],
      ['Meera Iyer', 'meera@mountcarmel.edu', 'BCom', 'Sem 3', 'Section B'],
      ['Rhea Thomas', 'rhea@mountcarmel.edu', 'BBA', 'Sem 3', 'Section C'],
      ['Sara Dsouza', 'sara@mountcarmel.edu', 'BCom', 'Sem 5', 'Section A'],
      ['Tara Nair', 'tara@mountcarmel.edu', 'BBA', 'Sem 3', 'Section C'],
    ];
    const extraStudents = [];
    for (const [name, email, program, semester, section] of studentSeeds) {
      const { rows: [student] } = await client.query(
        `INSERT INTO users (university_id, full_name, email, password_hash, role, program, semester, section)
         VALUES ($1,$2,$3,$4,'student',$5,$6,$7) RETURNING id, full_name`,
        [uni.id, name, email, passwordHash, program, semester, section]
      );
      extraStudents.push(student);
    }

    // ---------------- Events: "My Week" (Mon 12 Aug - Fri 16 Aug 2024) ----------------
    console.log('Creating events...');
    const events = [
      // Monday
      { title: 'Banking Law and Practice Assignment', type: 'assignment', date: weekdayDate(0, 18, 0), status: 'upcoming' },
      { title: 'CEE Course', type: 'class', date: weekdayDate(0, 6, 30), status: 'upcoming' },
      // Tuesday
      { title: 'Business Communication Presentation', type: 'presentation', date: weekdayDate(1, 10, 0), status: 'upcoming' },
      { title: 'Blue Book Submission', type: 'assignment', date: weekdayDate(1, 23, 59), status: 'due_soon', description: 'End of Day' },
      // Wednesday (has urgent exam)
      { title: 'CIA 1 Exam', type: 'exam', date: weekdayDate(2, 10, 0), status: 'urgent', description: 'Business Communication', location: 'B204', action_label: 'View Seating Plan', action_url: '/seating' },
      { title: 'View Seating Plan Before Exam', type: 'assignment', date: weekdayDate(2, 9, 0), status: 'urgent' },
      // Thursday
      { title: 'English Language Assignment', type: 'assignment', date: weekdayDate(3, 18, 0), status: 'upcoming' },
      { title: 'Association Work', type: 'association_work', date: weekdayDate(3, 15, 0), status: 'upcoming', description: '3:00 PM' },
      // Friday
      { title: 'Corporate Accounting Assignment', type: 'assignment', date: weekdayDate(4, 18, 0), status: 'due_soon' },
      { title: 'Marketing Management Presentation', type: 'presentation', date: weekdayDate(4, 23, 59), status: 'due_soon', description: 'End of Day', action_label: 'View Task', action_url: '/assignments/marketing-mgmt' },
    ];
    for (const e of events) {
      await client.query(
        `INSERT INTO events (user_id, title, event_type, description, location, starts_at, status, action_label, action_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [jhanavi.id, e.title, e.type, e.description || null, e.location || null, e.date, e.status, e.action_label || null, e.action_url || null]
      );
    }

    // Council meeting (Wednesday, separate highlighted card)
    await client.query(
      `INSERT INTO events (user_id, title, event_type, description, location, starts_at, status, action_label, action_url)
       VALUES ($1,'Council Meeting','meeting','Time: 3:00 PM','Auditorium',$2,'upcoming','View Details','/meetings/council')`,
      [jhanavi.id, weekdayDate(2, 15, 0)]
    );

    const adminEvents = [
      ['Business Communication', 'class', 'II BBA Section C', 'Classroom 204', weekdayDate(2, 10, 0), weekdayDate(2, 11, 0)],
      ['Corporate Accounting', 'class', 'II BCom Section B', 'Classroom 301', weekdayDate(2, 11, 30), weekdayDate(2, 12, 30)],
      ['Council Meeting', 'meeting', 'Faculty and Student Council', 'Auditorium', weekdayDate(2, 15, 0), weekdayDate(2, 16, 0)],
      ['CEE Course', 'class', 'Evening certificate class', 'Lab 2', weekdayDate(2, 18, 30), weekdayDate(2, 19, 30)],
    ];
    for (const [title, type, description, location, starts, ends] of adminEvents) {
      await client.query(
        `INSERT INTO events (user_id, title, event_type, description, location, starts_at, ends_at, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'upcoming')`,
        [admin.id, title, type, description, location, starts, ends]
      );
    }

    // ---------------- Notifications ----------------
    console.log('Creating notifications...');
    const notifications = [
      ['CIA Seating Plan Available', 'CIA 1 seating plan is now available. Please view it before the exam.', 'urgent'],
      ['Marketing Management Presentation', 'Submission due in 2 days.', 'warning'],
      ['New Internship Match', 'You have a 92% match with MGO.', 'success'],
    ];
    for (const [title, body, severity] of notifications) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, severity) VALUES ($1,$2,$3,$4)`,
        [jhanavi.id, title, body, severity]
      );
    }

    const adminNotifications = [
      ['CIA Seating Plan Available', 'Students of II BBA can now view their seating plan.', 'urgent'],
      ['Marketing Management Presentation', 'Submissions pending review.', 'warning'],
      ['Blue Book Submission Reminder', 'Last date: 20 Aug 2024', 'success'],
      ['Council Meeting', 'Today at 3:00 PM in Auditorium.', 'info'],
    ];
    for (const [title, body, severity] of adminNotifications) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, severity) VALUES ($1,$2,$3,$4)`,
        [admin.id, title, body, severity]
      );
    }

    // ---------------- Announcements (AI processor sample) ----------------
    console.log('Creating announcements...');
    await client.query(
      `INSERT INTO announcements (university_id, raw_text, title, audience, body, action, event_date, scheduled_at, priority, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',$10)`,
      [
        uni.id,
        'Students of II BBA are informed that CIA seating plans are available. Students must check their seating plan before the exam and report any discrepancies to the examination cell by 13th August.',
        'CIA Seating Plan Available',
        'II BBA Students',
        'CIA seating plan is now available for students.',
        'View seating plan before exam',
        '2024-08-14',
        weekdayDate(2, 9, 0),
        'High',
        admin.id,
      ]
    );

    const adminAnnouncements = [
      ['Staff Meeting', 'Staff', 'Monthly staff meeting to discuss academic plan.', 'scheduled', weekdayDate(2, 11, 0), 'Medium'],
      ['Student Guidelines to be sent out', 'II BBA All Sections', 'General academic and examination guidelines.', 'draft', null, 'Medium'],
      ['Council Meeting', 'Council Members', 'Faculty and Student Council Meeting.', 'scheduled', weekdayDate(2, 15, 0), 'High'],
      ['Blue Book Submission Reminder', 'II BBA Section C', 'Reminder for Blue Book submission.', 'scheduled', weekdayDate(4, 10, 0), 'High'],
      ['Presentation Schedule', 'II BBA Section C', 'Schedule for marketing presentations.', 'draft', null, 'Low'],
      ['Old Orientation Circular', 'All Students', 'Archived orientation circular.', 'archived', null, 'Low'],
    ];
    for (const [title, audience, body, status, scheduledAt, priority] of adminAnnouncements) {
      await client.query(
        `INSERT INTO announcements (university_id, raw_text, title, audience, body, action, scheduled_at, priority, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uni.id, body, title, audience, body, 'Review details', scheduledAt, priority, status, admin.id]
      );
    }

    // ---------------- Internships ----------------
    console.log('Creating internships...');
    const internships = [
      {
        company: 'MGO', role: 'Strategy Intern', location: 'Bengaluru', mode: 'Hybrid',
        stipend_text: '₹35,000 / month', stipend_amount: 35000, duration: '3 months',
        deadline: weekdayDate(10), tags: ['Strategy', 'Research', 'Business Analysis'],
        description: 'Support the strategy team on market research, competitive analysis, and internal reporting for ongoing client engagements.',
        requirements: 'Currently pursuing a business/commerce degree. Strong Excel and PowerPoint skills. Prior case-study or consulting-club experience is a plus.',
      },
      {
        company: 'Goldman Sachs', role: 'Summer Analyst Intern', location: 'Bengaluru', mode: 'On-site',
        stipend_text: '₹1,25,000 / month', stipend_amount: 125000, duration: '2 months',
        deadline: weekdayDate(4), tags: ['Finance', 'Analytics', 'Problem Solving'],
        description: 'Work alongside analysts on financial modeling, market research, and client deliverables within the summer analyst program.',
        requirements: 'Strong quantitative background, proficiency in Excel, and a keen interest in financial markets. Prior finance coursework preferred.',
      },
      {
        company: 'EY', role: 'Assurance Intern', location: 'Bengaluru', mode: 'Hybrid',
        stipend_text: '₹30,000 / month', stipend_amount: 30000, duration: '6 weeks',
        deadline: weekdayDate(21), tags: ['Audit', 'Finance', 'Communication'],
        description: 'Assist audit engagement teams with documentation, client communication, and preliminary financial statement reviews.',
        requirements: 'Commerce or accounting background. Attention to detail and clear written communication. CA/CPA aspirants encouraged to apply.',
      },
      {
        company: 'Zomato', role: 'Marketing Intern', location: 'Remote', mode: 'Remote',
        stipend_text: '₹20,000 / month', stipend_amount: 20000, duration: '3 months',
        deadline: weekdayDate(2), tags: ['Marketing', 'Social Media', 'Content'],
        description: 'Plan and execute social media campaigns, analyze engagement metrics, and support brand partnerships for regional markets.',
        requirements: 'Familiarity with Instagram/Canva, strong writing skills, and an interest in consumer brands. Portfolio of past content is a plus.',
      },
    ];
    for (const i of internships) {
      const { rows: [intern] } = await client.query(
        `INSERT INTO internships
          (company_name, role_title, location, work_mode, stipend_text, stipend_amount, tags, description, requirements, duration, application_deadline)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [i.company, i.role, i.location, i.mode, i.stipend_text, i.stipend_amount, i.tags, i.description, i.requirements, i.duration, i.deadline]
      );
      // Demo match scores for seeded data — real matching overwrites these on CV upload.
      const demoScores = { 'MGO': 92, 'Goldman Sachs': 78, 'EY': 85, 'Zomato': 65 };
      const matchScore = demoScores[i.company] || null;
      await client.query(
        `INSERT INTO internship_applications (internship_id, user_id, status, match_score)
         VALUES ($1,$2,'suggested',$3)`,
        [intern.id, jhanavi.id, matchScore]
      );
    }

    // ---------------- Documents & Forms ----------------
    console.log('Creating documents...');
    const documents = [
      ['Valuation of Goodwill', 'Study Material', '2024-08-10'],
      ['Rural Marketing', 'Study Notes & Case Studies', '2024-08-08'],
      ['Central Banking and RBI', 'Important Concepts & Notes', '2024-08-05'],
      ['Blue Book Guidelines', 'Submission process & format', '2024-08-01'],
      ['NOC Form', 'Required for internships & events', '2024-07-28'],
    ];
    for (const [title, category, updated] of documents) {
      await client.query(
        `INSERT INTO documents (university_id, title, category, audience, file_url, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [uni.id, title, category, 'All Students', `/files/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, updated]
      );
    }

    console.log('Creating classes, rosters, tasks, and student queries...');
    const classSeeds = [
      ['Business Communication', 'II BBA', 'C', 64],
      ['Marketing Management', 'II BBA', 'C', 62],
      ['Corporate Accounting', 'II BCom', 'B', 58],
      ['English Language', 'II BBA', 'C', 60],
      ['Banking Law and Practice', 'III BCom', 'A', 55],
    ];
    const classRows = [];
    for (const [subject, program, section, count] of classSeeds) {
      const { rows: [klass] } = await client.query(
        `INSERT INTO classes (teacher_id, subject_name, program, section, student_count)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [admin.id, subject, program, section, count]
      );
      classRows.push(klass);
      const rosterNames = [jhanavi, ...extraStudents].slice(0, 6);
      for (let index = 0; index < rosterNames.length; index += 1) {
        await client.query(
          `INSERT INTO class_students (class_id, student_id, roll_no, full_name)
           VALUES ($1,$2,$3,$4)`,
          [klass.id, rosterNames[index].id, `${program.replace(/\D/g, '') || '2'}${section}${String(index + 1).padStart(2, '0')}`, rosterNames[index].full_name || 'Jhanavi']
        );
      }
    }

    const taskSeeds = [
      ['Review Marketing Management Presentations', classRows[1].id, weekdayDate(4, 0, 0).slice(0, 10), 'High'],
      ['Approve CIA Seating Plan', classRows[0].id, weekdayDate(2, 0, 0).slice(0, 10), 'Medium'],
      ['Evaluate Blue Books', classRows[0].id, weekdayDate(4, 0, 0).slice(0, 10), 'High'],
      ['Prepare Student Guidelines', classRows[0].id, weekdayDate(3, 0, 0).slice(0, 10), 'Medium'],
      ['Upload Study Material - Central Banking & RBI', classRows[4].id, weekdayDate(4, 0, 0).slice(0, 10), 'Low'],
    ];
    for (const [title, classId, due, priority] of taskSeeds) {
      await client.query(
        `INSERT INTO pending_tasks (admin_id, class_id, title, due_date, priority)
         VALUES ($1,$2,$3,$4,$5)`,
        [admin.id, classId, title, due, priority]
      );
    }

    const querySeeds = [
      [jhanavi.id, classRows[0].id, 'CIA seating plan', 'Where can I find my CIA seating plan?'],
      [extraStudents[0].id, classRows[1].id, 'Presentation submission', 'Should we upload slides as PDF or PPT?'],
      [extraStudents[1].id, classRows[0].id, 'Blue Book', 'Can I submit the Blue Book tomorrow morning?'],
      [extraStudents[2].id, classRows[2].id, 'Accounting assignment', 'Is goodwill valuation included in the test?'],
    ];
    for (const [studentId, classId, subject, message] of querySeeds) {
      await client.query(
        `INSERT INTO student_queries (admin_id, student_id, class_id, subject, message)
         VALUES ($1,$2,$3,$4,$5)`,
        [admin.id, studentId, classId, subject, message]
      );
    }

    // ---------------- Admin analytics ----------------
    console.log('Creating admin analytics data...');
    const deadlines = [
      ['CIA Seating Plan Check', weekdayDate(2, 0, 0).slice(0, 10), 'High', 452],
      ['Marketing Management Presentation', weekdayDate(4, 0, 0).slice(0, 10), 'High', 318],
      ['Blue Book Submission', weekdayDate(1, 0, 0).slice(0, 10), 'Medium', 265],
    ];
    for (const [title, due, priority, affected] of deadlines) {
      await client.query(
        `INSERT INTO deadlines (university_id, title, due_date, priority, affected_students)
         VALUES ($1,$2,$3,$4,$5)`,
        [uni.id, title, due, priority, affected]
      );
    }

    const queries = [
      ['CIA seating plan', 254],
      ['Blue Book submission', 198],
      ['Internship NOC procedure', 176],
    ];
    for (const [text, count] of queries) {
      await client.query(
        `INSERT INTO ai_queries (university_id, query_text, hit_count) VALUES ($1,$2,$3)`,
        [uni.id, text, count]
      );
    }

    await client.query(
      `INSERT INTO admin_insights (university_id, insight_text) VALUES ($1,$2)`,
      [uni.id, 'Students are frequently searching for Blue Book submission guidelines. Consider pinning the document.']
    );

    // ---------------- Seating / Exam Module ----------------
    console.log('Creating seating data...');

    // Halls
    const { rows: [hallB204] } = await client.query(
      `INSERT INTO exam_halls (university_id, name, capacity, rows, seats_per_row)
       VALUES ($1,'Hall B204',30,5,6) RETURNING id`,
      [uni.id]
    );
    const { rows: [hallSeminar] } = await client.query(
      `INSERT INTO exam_halls (university_id, name, capacity, rows, seats_per_row)
       VALUES ($1,'Seminar Hall 1',24,4,6) RETURNING id`,
      [uni.id]
    );

    // Exam session: CIA 1 — matches the CIA 1 Exam event seeded above
    const ciaDate = new Date(weekdayDate(2, 10, 0));
    const { rows: [cia1] } = await client.query(
      `INSERT INTO exam_sessions (university_id, title, exam_date, start_time, end_time, program, semester, published, published_at, created_by)
       VALUES ($1,'CIA 1 — BBA Semester 3',$2,'10:00','12:00','BBA',3,true,now(),$3) RETURNING id`,
      [uni.id, ciaDate.toISOString().slice(0, 10), admin.id]
    );

    // Second session (unpublished — admin can see it, students cannot)
    const nextWeek = new Date(ciaDate);
    nextWeek.setDate(ciaDate.getDate() + 7);
    const { rows: [cia2] } = await client.query(
      `INSERT INTO exam_sessions (university_id, title, exam_date, start_time, end_time, program, semester, published, created_by)
       VALUES ($1,'CIA 2 — BBA Semester 3',$2,'10:00','12:00','BBA',3,false,$3) RETURNING id`,
      [uni.id, nextWeek.toISOString().slice(0, 10), admin.id]
    );

    // Seat assignments for CIA 1 in Hall B204
    // All 7 students (jhanavi + 6 extra) — jhanavi gets Row 3, Seat 4 for the demo
    const allStudents = [jhanavi, ...extraStudents];
    // Assign jhanavi first so her seat is deterministic: Row 3, Seat 4
    const seatPlan = [
      { student: jhanavi, row: 3, seat: 4 },
      { student: extraStudents[0], row: 1, seat: 1 },
      { student: extraStudents[1], row: 1, seat: 2 },
      { student: extraStudents[2], row: 2, seat: 1 },
      { student: extraStudents[3], row: 2, seat: 2 },
      { student: extraStudents[4], row: 4, seat: 1 },
      { student: extraStudents[5], row: 4, seat: 2 },
    ];
    for (const { student, row, seat } of seatPlan) {
      // Get roll_no from class_students if available
      const { rows: csRows } = await client.query(
        `SELECT roll_no FROM class_students WHERE student_id = $1 LIMIT 1`,
        [student.id]
      );
      const rollNo = csRows[0]?.roll_no || null;
      await client.query(
        `INSERT INTO seat_assignments (session_id, hall_id, student_id, row_number, seat_number, roll_no)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [cia1.id, hallB204.id, student.id, row, seat, rollNo]
      );
    }

    // Invigilation duties for CIA 1
    await client.query(
      `INSERT INTO invigilation_duties (session_id, hall_id, admin_id, duty_role)
       VALUES ($1,$2,$3,'chief_invigilator')`,
      [cia1.id, hallB204.id, admin.id]
    );
    await client.query(
      `INSERT INTO invigilation_duties (session_id, hall_id, admin_id, duty_role)
       VALUES ($1,$2,$3,'invigilator')`,
      [cia1.id, hallSeminar.id, admin.id]
    );

    await client.query('COMMIT');
    console.log('Seed complete. Login: jhanavi@mountcarmel.edu / password123 (student), admin@mountcarmel.edu / password123 (admin)');
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
