-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Users Table (extends Clerk auth)
create table public.users (
  id uuid references auth.users not null primary key,
  clerk_id text unique not null,
  email text not null,
  role text default 'student' check (role in ('student', 'recruiter')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles Table
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  full_name text,
  headline text,
  bio text,
  cgpa numeric(4,2),
  branch text,
  target_role text,
  github_username text,
  linkedin_url text,
  skills text[],
  study_hours_per_week integer,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Resumes Table
create table public.resumes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  file_url text not null,
  parsed_content jsonb,
  ats_score integer,
  skillsprint_score integer,
  placement_probability numeric(5,2),
  weak_areas text[],
  missing_skills text[],
  suggestions jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Career Twins Table
create table public.career_twins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  prediction_3m jsonb,
  prediction_6m jsonb,
  prediction_12m jsonb,
  salary_projection text,
  risk_factors text[],
  growth_opportunities text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Mock Interviews Table
create table public.interviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  mode text not null,
  transcript jsonb,
  communication_score integer,
  confidence_score integer,
  technical_score integer,
  leadership_score integer,
  overall_score integer,
  improvement_suggestions text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Student Embeddings for Recruiter Search
create table public.student_embeddings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  profile_summary text,
  embedding vector(1536), -- Assuming OpenAI ada-002
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Learning Roadmaps Table
create table public.learning_roadmaps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  target_company text,
  target_role text,
  daily_tasks jsonb,
  weekly_tasks jsonb,
  monthly_tasks jsonb,
  completion_percentage integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activity Logs
create table public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.career_twins enable row level security;
alter table public.interviews enable row level security;
alter table public.student_embeddings enable row level security;
alter table public.learning_roadmaps enable row level security;
alter table public.activity_logs enable row level security;

-- Only users can see their own data
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = user_id);
-- Repeat for other tables... (simplified for MVP)
