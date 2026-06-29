-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('student','teacher','parent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Skills and knowledge graph
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    curriculum TEXT NOT NULL,
    criterion TEXT NOT NULL,
    difficulty INTEGER DEFAULT 1,
    prerequisites UUID[] DEFAULT '{}'
);

-- 3. Student mastery
CREATE TABLE student_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    mastery_level TEXT DEFAULT 'Not Started',
    accuracy_rate FLOAT DEFAULT 0.0,
    attempts INTEGER DEFAULT 0,
    last_attempted TIMESTAMPTZ,
    UNIQUE(student_id, skill_id)
);

-- 4. Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES profiles(id),
    student_id UUID REFERENCES profiles(id),
    skill_id UUID REFERENCES skills(id),
    criterion TEXT,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Question templates
CREATE TABLE question_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    template_type TEXT NOT NULL,
    python_generator_hash TEXT,
    ai_context_prompt TEXT,
    verified BOOLEAN DEFAULT FALSE
);

-- 6. Misconceptions
CREATE TABLE misconceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id),
    misconception_type TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    resolved BOOLEAN DEFAULT FALSE
);

-- 7. Practice attempts
CREATE TABLE practice_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    question_id UUID,
    skill_id UUID REFERENCES skills(id),
    correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Row level security policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Students
CREATE POLICY "Students manage own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Students view own mastery" ON student_mastery
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students view own assignments" ON assignments
    FOR SELECT USING (auth.uid() = student_id);

-- Teachers
CREATE POLICY "Teachers view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'teacher'
        )
    );

CREATE POLICY "Teachers manage assignments" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'teacher'
        )
    );

CREATE POLICY "Teachers view all mastery" ON student_mastery
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'teacher'
        )
    );