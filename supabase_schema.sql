-- Supabase Schema for Project Z
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for user roles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('student','teacher','parent')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Skills table representing math skills
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    curriculum TEXT NOT NULL,
    criterion TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    prerequisites UUID[] DEFAULT '{}'
);

-- Student Mastery table for tracking student progress
CREATE TABLE IF NOT EXISTS student_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    mastery_level TEXT DEFAULT 'Not Started',
    accuracy_rate FLOAT DEFAULT 0.0,
    attempts INTEGER DEFAULT 0,
    last_attempted TIMESTAMP,
    UNIQUE (student_id, skill_id)
);


-- Assignments table to track tasks assigned by teachers
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    criterion TEXT,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question templates table to store generator and context data
CREATE TABLE IF NOT EXISTS question_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL,
    generator_hash TEXT,
    ai_context_prompt TEXT,
    verification_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Misconceptions table to store common misconceptions for each student and skill
CREATE TABLE IF NOT EXISTS misconceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
    misconception_type TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice attempts table to log each student practice attempt
CREATE TABLE IF NOT EXISTS practice_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id),
    question TEXT,
    correct_answer TEXT,
    student_answer TEXT,
    is_correct BOOLEAN,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;

-- Policies: Students can only view and edit their own data
CREATE POLICY "Students can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Students can edit their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Students view own mastery" ON student_mastery FOR SELECT USING (auth.uid() = student_id);

-- Policies: Teachers can manage assignments
CREATE POLICY "Teachers manage assignments" ON assignments FOR ALL USING ((auth.uid() IN (SELECT id FROM profiles WHERE role = 'teacher')));

-- Additional tables may be added to support assignments, misconceptions, etc.
