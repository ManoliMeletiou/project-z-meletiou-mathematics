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

-- Additional tables may be added to support assignments, misconceptions, etc.
