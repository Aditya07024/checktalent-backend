-- ==============================================================================
-- CHECKTALENT / TALENTLENS - SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase Project SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create Users & Dashboard Profiles Table
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

-- Index on firebase_uid and role for rapid query lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Create Dashboard Role Metrics Table (User-Specific Custom State / KPIs)
CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'offcampus', 'campus')),
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_dashboard_user FOREIGN KEY (firebase_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_uid ON public.dashboard_metrics(firebase_uid);

-- 3. Create Candidate Code Evaluations & AI Forensics Table
CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    architecture_score INTEGER CHECK (architecture_score >= 0 AND architecture_score <= 100),
    maintainability_score INTEGER CHECK (maintainability_score >= 0 AND maintainability_score <= 100),
    security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
    ai_generated_ratio NUMERIC(5,2) DEFAULT 0.00,
    authorship_verified BOOLEAN DEFAULT TRUE,
    analysis_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_eval_user FOREIGN KEY (firebase_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evaluations_uid ON public.candidate_evaluations(firebase_uid);

-- 4. Create Job Postings Table (Off-Campus Recruiter Workspace)
CREATE TABLE IF NOT EXISTS public.job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_uid TEXT NOT NULL,
    company_name TEXT NOT NULL,
    title TEXT NOT NULL,
    role_type TEXT DEFAULT 'Full-Time',
    location TEXT DEFAULT 'Remote',
    salary_range TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
    required_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_job_recruiter FOREIGN KEY (recruiter_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_postings_recruiter ON public.job_postings(recruiter_uid);

-- 5. Create Campus Placement Drives Table (TPO / College Workspace)
CREATE TABLE IF NOT EXISTS public.campus_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tpo_uid TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    drive_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'ongoing', 'completed')),
    eligible_branches TEXT[] DEFAULT ARRAY[]::TEXT[],
    batch_year TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_drive_tpo FOREIGN KEY (tpo_uid) REFERENCES public.users(firebase_uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campus_drives_tpo ON public.campus_drives(tpo_uid);

-- 6. Row Level Security (RLS) Configuration
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_drives ENABLE ROW LEVEL SECURITY;

-- Allow read/write access via Supabase Service Role and Authenticated Users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access for users') THEN
        CREATE POLICY "Allow public read access for users" ON public.users FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert/update for service role and users') THEN
        CREATE POLICY "Allow insert/update for service role and users" ON public.users FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on dashboard_metrics') THEN
        CREATE POLICY "Allow all on dashboard_metrics" ON public.dashboard_metrics FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on candidate_evaluations') THEN
        CREATE POLICY "Allow all on candidate_evaluations" ON public.candidate_evaluations FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on job_postings') THEN
        CREATE POLICY "Allow all on job_postings" ON public.job_postings FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on campus_drives') THEN
        CREATE POLICY "Allow all on campus_drives" ON public.campus_drives FOR ALL USING (true);
    END IF;
END $$;
