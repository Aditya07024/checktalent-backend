-- ==============================================================================
-- CHECKTALENT / TALENTLENS - COMPLETE SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ttzmcpvffmicmhbaadfb/sql
-- ==============================================================================

-- 1. Users Table (Stores Firebase Auth Users & Permanent Roles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT,
    display_name TEXT,
    photo_url TEXT,
    role TEXT CHECK (role IN ('student', 'offcampus', 'campus')),
    role_locked BOOLEAN DEFAULT TRUE,
    role_assigned_at TIMESTAMPTZ DEFAULT NOW(),
    institution TEXT,
    company_name TEXT,
    headline TEXT,
    target_role TEXT,
    department TEXT,
    batch_year TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Candidate Repositories Table (Audited or Connected Repos)
CREATE TABLE IF NOT EXISTS public.candidate_repos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    language TEXT DEFAULT 'TypeScript',
    commits INTEGER DEFAULT 0,
    lines_of_code INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Audited',
    authorship TEXT DEFAULT 'Verified Original',
    ai_percent INTEGER DEFAULT 0,
    tutorial_match_percent INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_candidate_repo_user FOREIGN KEY (candidate_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_candidate_repos_uid ON public.candidate_repos(candidate_uid);

-- 3. Candidate Applications Table (Applied Jobs & Campus Drives)
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_uid TEXT NOT NULL,
    job_id TEXT,
    drive_id TEXT,
    company_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('offcampus', 'campus')),
    status TEXT DEFAULT 'Applied',
    match_score INTEGER DEFAULT 85,
    location TEXT,
    ctc TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_application_user FOREIGN KEY (candidate_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_uid ON public.applications(candidate_uid);

-- 4. Job Postings Table (Off-Campus Recruiter Workspace)
CREATE TABLE IF NOT EXISTS public.job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_uid TEXT NOT NULL,
    company_name TEXT NOT NULL,
    title TEXT NOT NULL,
    department TEXT DEFAULT 'Engineering',
    location TEXT DEFAULT 'Remote',
    type TEXT DEFAULT 'Full-Time',
    salary TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Closed')),
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    min_score INTEGER DEFAULT 80,
    applicants INTEGER DEFAULT 0,
    shortlisted INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_job_recruiter FOREIGN KEY (recruiter_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_postings_recruiter ON public.job_postings(recruiter_uid);

-- 5. Campus Placement Drives Table (TPO / College Workspace)
CREATE TABLE IF NOT EXISTS public.campus_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tpo_uid TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    role TEXT NOT NULL,
    package TEXT DEFAULT '₹12 LPA',
    visit_date DATE NOT NULL,
    cutoff_cgpa NUMERIC(4,2) DEFAULT 7.00,
    cutoff_proof_score INTEGER DEFAULT 75,
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Ongoing', 'Completed')),
    eligible_branches TEXT[] DEFAULT ARRAY[]::TEXT[],
    batch_year TEXT DEFAULT '2026',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_drive_tpo FOREIGN KEY (tpo_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campus_drives_tpo ON public.campus_drives(tpo_uid);

-- 6. Campus Students Roster Table (TPO Batch Management)
CREATE TABLE IF NOT EXISTS public.campus_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tpo_uid TEXT NOT NULL,
    name TEXT NOT NULL,
    usn TEXT NOT NULL,
    department TEXT NOT NULL,
    cgpa TEXT DEFAULT '8.5',
    proof_score INTEGER DEFAULT 85,
    repos_verified INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Drive Ready',
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_campus_students_tpo FOREIGN KEY (tpo_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campus_students_tpo ON public.campus_students(tpo_uid);

-- 7. Scheduled Interviews Table (Recruiter <-> Candidate)
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_uid TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    candidate_role TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    round_type TEXT NOT NULL,
    interviewer TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_interview_recruiter FOREIGN KEY (recruiter_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interviews_recruiter ON public.interviews(recruiter_uid);

-- 8. Dashboard Role Custom Metrics Table
CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'offcampus', 'campus')),
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_dashboard_metrics_user FOREIGN KEY (firebase_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_uid ON public.dashboard_metrics(firebase_uid);

-- ==============================================================================
-- Row Level Security (RLS) & Access Policies
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access on users" ON public.users;
    CREATE POLICY "Public access on users" ON public.users FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public access on candidate_repos" ON public.candidate_repos;
    CREATE POLICY "Public access on candidate_repos" ON public.candidate_repos FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public access on applications" ON public.applications;
    CREATE POLICY "Public access on applications" ON public.applications FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public access on job_postings" ON public.job_postings;
    CREATE POLICY "Public access on job_postings" ON public.job_postings FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public access on campus_drives" ON public.campus_drives;
    CREATE POLICY "Public access on campus_drives" ON public.campus_drives FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public access on campus_students" ON public.campus_students;
    CREATE POLICY "Public access on campus_students" ON public.campus_students FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public access on interviews" ON public.interviews;
    CREATE POLICY "Public access on interviews" ON public.interviews FOR ALL USING (true);

    DROP POLICY IF EXISTS "Public access on dashboard_metrics" ON public.dashboard_metrics;
    CREATE POLICY "Public access on dashboard_metrics" ON public.dashboard_metrics FOR ALL USING (true);
END $$;
