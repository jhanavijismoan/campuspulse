-- Attendance system migration
-- Run once to add attendance_type/semester to classes and seed 3rd Sem BBA C

-- 1. Add columns to classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS attendance_type TEXT NOT NULL DEFAULT 'Theory';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN ('present', 'absent', 'late', 'cl'));

-- 2. Clear existing fake data for BBA C classes and rebuild properly
-- Remove old fake classes + cascade cleans class_students + attendance_records
DELETE FROM classes WHERE program IN ('II BBA', 'II BCom', 'III BCom');

-- 3. Insert the 7 subjects for 3rd Sem BBA C
-- teacher_id = 2 (admin@mountcarmel.edu)
INSERT INTO classes (teacher_id, subject_name, program, section, semester, attendance_type, student_count) VALUES
  (2, 'Intermediate French Level-1',               'BBA', 'C', 'Sem 3', 'Theory', 53),
  (2, 'Banking Law and Practice',                   'BBA', 'C', 'Sem 3', 'Theory', 53),
  (2, 'Marketing Management',                       'BBA', 'C', 'Sem 3', 'Theory', 53),
  (2, 'Corporate Accounting',                       'BBA', 'C', 'Sem 3', 'Theory', 53),
  (2, 'Business Communication',                     'BBA', 'C', 'Sem 3', 'Theory', 53),
  (2, 'General English - Esperanza - Aspiring Hope','BBA', 'C', 'Sem 3', 'Theory', 53),
  (2, 'Information Technology for Managers',        'BBA', 'C', 'Sem 3', 'Theory', 53)
ON CONFLICT DO NOTHING;

-- 4. Insert all 53 students from PDF roster into every BBA C class
-- student_id links to users table: MB257222 = JHANAVI JISMOAN CHALAKKEL = user id 1
DO $$
DECLARE
  cls RECORD;
BEGIN
  FOR cls IN SELECT id FROM classes WHERE program = 'BBA' AND section = 'C' AND semester = 'Sem 3' LOOP
    INSERT INTO class_students (class_id, student_id, roll_no, full_name) VALUES
      (cls.id, NULL, 'MB257201', 'A LOHITH CHOWDARY'),
      (cls.id, NULL, 'MB257202', 'AANYA GUPTA'),
      (cls.id, NULL, 'MB257203', 'AFEEFA SAMEER'),
      (cls.id, NULL, 'MB257205', 'AGRIMA VAISH'),
      (cls.id, NULL, 'MB257206', 'AKSHAYA S'),
      (cls.id, NULL, 'MB257207', 'ANAGANI KAMALA SHRITA'),
      (cls.id, NULL, 'MB257208', 'ANISH K HIRMUTT'),
      (cls.id, NULL, 'MB257209', 'ANJALI KARNAWAT'),
      (cls.id, NULL, 'MB257210', 'ANUSHKAA DWIVEDI'),
      (cls.id, NULL, 'MB257211', 'BHUMI SHAHDEO'),
      (cls.id, NULL, 'MB257212', 'CINDERELLA.K'),
      (cls.id, NULL, 'MB257213', 'DHANUSH RAJ A'),
      (cls.id, NULL, 'MB257215', 'DISHA RAJ'),
      (cls.id, NULL, 'MB257216', 'DIVYANSHI'),
      (cls.id, NULL, 'MB257217', 'ESHA UDESHI'),
      (cls.id, NULL, 'MB257218', 'ESHAN RORIA'),
      (cls.id, NULL, 'MB257220', 'HARSHINI ADITYA AALAVANDAR'),
      (cls.id, NULL, 'MB257221', 'HURAIN MALIK'),
      (cls.id, 1,    'MB257222', 'JHANAVI JISMOAN CHALAKKEL'),
      (cls.id, NULL, 'MB257223', 'AAMINA ARHAM'),
      (cls.id, NULL, 'MB257225', 'KANISHKA SEN'),
      (cls.id, NULL, 'MB257226', 'KASHVI BALAJI'),
      (cls.id, NULL, 'MB257228', 'KRISHI RAI'),
      (cls.id, NULL, 'MB257231', 'KUSHITHA YM'),
      (cls.id, NULL, 'MB257232', 'LAVINIA DKHAR'),
      (cls.id, NULL, 'MB257233', 'LEHYA.B'),
      (cls.id, NULL, 'MB257234', 'MADIHA RAMEEN'),
      (cls.id, NULL, 'MB257235', 'MAHEK NILANCHAL PADHY'),
      (cls.id, NULL, 'MB257236', 'MANAN P GANDHI'),
      (cls.id, NULL, 'MB257237', 'MANISHA CHOUDHARY B'),
      (cls.id, NULL, 'MB257239', 'MOUSUMI SINGH'),
      (cls.id, NULL, 'MB257240', 'NAVSHEEN SHAIKH KHALANDAR'),
      (cls.id, NULL, 'MB257242', 'NIHAR P MALI'),
      (cls.id, NULL, 'MB257244', 'PRATHIKSHA.H'),
      (cls.id, NULL, 'MB257245', 'PRATHIKSHA P'),
      (cls.id, NULL, 'MB257246', 'PUESH AGARWAL'),
      (cls.id, NULL, 'MB257247', 'RABJOT KAUR'),
      (cls.id, NULL, 'MB257248', 'RISHIKA LOKESH'),
      (cls.id, NULL, 'MB257249', 'ROHITH P'),
      (cls.id, NULL, 'MB257251', 'SHATABDI RASAILY'),
      (cls.id, NULL, 'MB257252', 'SHIVAM SINGH'),
      (cls.id, NULL, 'MB257253', 'SIRI PATRO'),
      (cls.id, NULL, 'MB257254', 'SONALI M'),
      (cls.id, NULL, 'MB257255', 'SRRIEWERSHUN KM'),
      (cls.id, NULL, 'MB257256', 'SYED ZAMAN'),
      (cls.id, NULL, 'MB257257', 'TIA LANCELOT DSOUZA'),
      (cls.id, NULL, 'MB257258', 'UDDIPTA BARUAH'),
      (cls.id, NULL, 'MB257259', 'YASHASWI TOMAR'),
      (cls.id, NULL, 'MB257260', 'YOIHENBA WAIKHOM'),
      (cls.id, NULL, 'MB257262', 'PRIANSHI SINGH'),
      (cls.id, NULL, 'MB257263', 'KURELLA SOWMYA PRIYA'),
      (cls.id, NULL, 'MB257265', 'RIYA'),
      (cls.id, NULL, 'MB257267', 'ANDREWS VIJAY')
    ON CONFLICT (class_id, roll_no) DO NOTHING;
  END LOOP;
END $$;

-- 5. Seed sample attendance matching the screenshot for Jhanavi (MB257222, student_id=1)
-- Screenshot: French 25/26, Banking 19/22, Marketing 25/27, Accounting 26/28, BizComm 28/30, GenEng 17/19, IT 15/15
DO $$
DECLARE
  cls_french   INTEGER;
  cls_banking  INTEGER;
  cls_mktg     INTEGER;
  cls_acct     INTEGER;
  cls_bizcomm  INTEGER;
  cls_eng      INTEGER;
  cls_it       INTEGER;
  jhanavi_cs   INTEGER;
  d            DATE;
  i            INTEGER;
  total        INTEGER;
  present_n    INTEGER;
BEGIN
  SELECT id INTO cls_french  FROM classes WHERE subject_name = 'Intermediate French Level-1'                AND program='BBA' AND section='C';
  SELECT id INTO cls_banking FROM classes WHERE subject_name = 'Banking Law and Practice'                   AND program='BBA' AND section='C';
  SELECT id INTO cls_mktg    FROM classes WHERE subject_name = 'Marketing Management'                       AND program='BBA' AND section='C';
  SELECT id INTO cls_acct    FROM classes WHERE subject_name = 'Corporate Accounting'                       AND program='BBA' AND section='C';
  SELECT id INTO cls_bizcomm FROM classes WHERE subject_name = 'Business Communication'                     AND program='BBA' AND section='C';
  SELECT id INTO cls_eng     FROM classes WHERE subject_name LIKE 'General English%'                        AND program='BBA' AND section='C';
  SELECT id INTO cls_it      FROM classes WHERE subject_name = 'Information Technology for Managers'        AND program='BBA' AND section='C';

  -- Helper: insert attendance sessions for Jhanavi for a given class
  -- conducted = N sessions, present = P of them present, rest absent
  -- dates go back from today
  FOR r IN SELECT * FROM (VALUES
    (cls_french,  26, 25),
    (cls_banking, 22, 19),
    (cls_mktg,    27, 25),
    (cls_acct,    28, 26),
    (cls_bizcomm, 30, 28),
    (cls_eng,     19, 17),
    (cls_it,      15, 15)
  ) AS t(class_id, conducted, present_cnt) LOOP
    SELECT id INTO jhanavi_cs FROM class_students WHERE class_id = r.class_id AND roll_no = 'MB257222';
    FOR i IN 1..r.conducted LOOP
      d := CURRENT_DATE - ((r.conducted - i) * 3)::INTEGER;
      INSERT INTO attendance_records (class_id, class_student_id, attendance_date, status, marked_by)
      VALUES (
        r.class_id,
        jhanavi_cs,
        d,
        CASE WHEN i <= r.present_cnt THEN 'present' ELSE 'absent' END,
        2
      )
      ON CONFLICT (class_id, class_student_id, attendance_date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
