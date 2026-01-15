-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  auth_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text unique,
  role text check (role in ('admin', 'master', 'manager', 'staff')) not null default 'staff',
  position text, -- 'waiter', 'barista', etc.
  phone text,
  ic_number text,
  address text,
  bank_name text,
  bank_account text,
  password text,
  base_salary decimal(10, 2) default 0.00,
  start_date date,
  is_active boolean default true,
  onboarding_kit jsonb default '[]'::jsonb,
  ic_front_url text,
  ic_back_url text,
  emergency_contacts jsonb default '[]'::jsonb,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.users for select using (true);
create policy "Managers can insert staff." on public.users for insert with check (
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);
create policy "Users can update own profile or managers can update all." on public.users for update using (
  auth_id = auth.uid() or 
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);
create policy "Managers can delete staff." on public.users for delete using (
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

-- 2. ATTENDANCE TABLE
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  clock_in timestamp with time zone default timezone('utc'::text, now()),
  clock_out timestamp with time zone,
  location_lat double precision,
  location_long double precision,
  selfie_url text,
  penalty_amount decimal(10, 2) default 0.00,
  status text check (status in ('present', 'late', 'absent')) default 'present',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. SHOP SETTINGS TABLE
create table public.shop_settings (
  id uuid default uuid_generate_v4() primary key,
  shop_name text not null default 'Shamieda Briyani House',
  address text not null default 'No 12, Jalan Kebun, Shah Alam',
  latitude double precision not null default 3.1412,
  longitude double precision not null default 101.6865,
  radius integer not null default 50,
  start_time time not null default '09:00:00',
  end_time time not null default '18:00:00',
  late_penalty_per_minute decimal(10, 2) default 0.00,
  penalty_15m decimal(10, 2) default 0.00,
  penalty_30m decimal(10, 2) default 0.00,
  penalty_max decimal(10, 2) default 0.00,
  attendance_bonus decimal(10, 2) default 0.00,
  daily_reward decimal(10, 2) default 0.00,
  weekly_reward decimal(10, 2) default 0.00,
  monthly_reward decimal(10, 2) default 0.00,
  salary_reward_pct decimal(5, 2) default 0.00,
  onboarding_kit_config jsonb default '[]'::jsonb,
  advance_limit decimal(10, 2) default 500.00,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dynamic Bonus Configurations
create table public.bonus_configs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('fixed', 'salary_multiplier', 'percentage')),
  value decimal(10, 2) not null default 0.00,
  requirement_type text not null check (requirement_type in ('attendance_days', 'punctuality', 'general', 'ranking')),
  requirement_value integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for bonus_configs
alter table public.bonus_configs enable row level security;

create policy "Allow read for all" on public.bonus_configs
  for select using (true);

create policy "Allow full access for manager/master" on public.bonus_configs
  for all using (
    exists (
      select 1 from public.users
      where users.auth_id = auth.uid()
      and users.role in ('admin', 'manager', 'master')
    )
  );

-- Insert default settings row (Singleton pattern)
insert into public.shop_settings (id, shop_name, address, latitude, longitude, radius)
values ('00000000-0000-0000-0000-000000000001', 'Shamieda Briyani House', 'No 12, Jalan Kebun, Shah Alam', 3.1412, 101.6865, 50)
on conflict (id) do nothing;

-- RLS Policies for Shop Settings
alter table public.shop_settings enable row level security;

create policy "Enable read access for all users" on public.shop_settings
  for select using (true);

create policy "Enable update access for managers only" on public.shop_settings
  for update using (
    exists (
      select 1 from public.users
      where users.auth_id = auth.uid() and users.role in ('admin', 'manager', 'master')
    )
  );

create policy "Enable insert access for managers only" on public.shop_settings
  for insert with check (
    exists (
      select 1 from public.users
      where users.auth_id = auth.uid() and users.role in ('admin', 'manager', 'master')
    )
  );

alter table public.attendance enable row level security;

create policy "Staff can view own attendance" on public.attendance for select using (
  exists (select 1 from public.users where id = attendance.user_id and auth_id = auth.uid())
);
create policy "Staff can insert attendance" on public.attendance for insert with check (
  exists (select 1 from public.users where id = attendance.user_id and auth_id = auth.uid())
);
create policy "Managers can view all attendance" on public.attendance for select using (
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

create policy "Managers can update attendance" on public.attendance for update using (
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

create policy "Managers can delete attendance" on public.attendance for delete using (
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

-- 3. TASKS TABLE (Operations)
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  position text not null, -- 'waiter', 'barista', etc.
  assigned_to uuid references public.users(id) on delete cascade,
  is_completed boolean default false,
  proof_url text, -- Image of clean station
  verified_by uuid references public.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

create policy "Users can view their own tasks" on public.tasks
  for select using (
    exists (
      select 1 from public.users
      where users.id = tasks.assigned_to and users.auth_id = auth.uid()
    )
  );

create policy "Users can insert their own tasks" on public.tasks
  for insert with check (
    exists (
      select 1 from public.users
      where users.id = tasks.assigned_to and users.auth_id = auth.uid()
    )
  );

create policy "Users can update their own tasks" on public.tasks
  for update using (
    exists (
      select 1 from public.users
      where users.id = tasks.assigned_to and users.auth_id = auth.uid()
    )
  );

create policy "Users can delete their own tasks" on public.tasks
  for delete using (
    exists (
      select 1 from public.users
      where users.id = tasks.assigned_to and users.auth_id = auth.uid()
    )
  );

create policy "Managers can manage all tasks" on public.tasks
  for all using (
    exists (
      select 1 from public.users
      where users.auth_id = auth.uid() and users.role in ('admin', 'manager', 'master')
    )
  );

-- 4. PAYROLL TABLE
create table public.payroll (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  month text not null, -- '2023-10'
  basic_salary decimal(10, 2) not null,
  total_penalty decimal(10, 2) default 0.00,
  total_bonus decimal(10, 2) default 0.00,
  final_amount decimal(10, 2) not null,
  status text check (status in ('pending', 'paid')) default 'pending',
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payroll enable row level security;

-- TRIGGER: Auto-create or link user profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  -- Check if user already exists by email (onboarded by manager)
  if exists (select 1 from public.users where email = new.email) then
    update public.users 
    set auth_id = new.id,
        full_name = coalesce(full_name, new.raw_user_meta_data->>'full_name')
    where email = new.email;
  else
    insert into public.users (auth_id, full_name, email, role)
    values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'staff');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. TASK TEMPLATES TABLE
create table public.task_templates (
  id uuid default uuid_generate_v4() primary key,
  position text not null, -- 'waiter', 'barista', etc.
  title text not null,
  description text,
  deadline_time time,
  penalty_amount decimal(10, 2) default 0.00,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.task_templates enable row level security;

create policy "Enable read access for all users" on public.task_templates
  for select using (true);

create policy "Enable full access for managers" on public.task_templates
  for all using (
    exists (
      select 1 from public.users
      where users.auth_id = auth.uid() and users.role in ('admin', 'manager', 'master')
    )
  );
-- 6. POSITIONS TABLE
create table public.positions (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.positions enable row level security;

create policy "Enable read access for all users" on public.positions
  for select using (true);

create policy "Managers can insert positions" on public.positions for insert with check (
    exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
  );

create policy "Managers can update positions" on public.positions for update using (
    exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
  );

create policy "Managers can delete positions" on public.positions for delete using (
    exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
  );

-- Insert default positions
insert into public.positions (name)
values ('Waiter'), ('Barista'), ('Kitchen Helper'), ('Chef'), ('Supervisor')
on conflict (name) do nothing;
-- 6. STORAGE POLICIES
-- Allow managers to upload/update/delete staff documents
create policy "Managers can upload staff documents"
on storage.objects for insert
with check (
  bucket_id = 'staff-docs' AND
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

create policy "Managers can update staff documents"
on storage.objects for update
using (
  bucket_id = 'staff-docs' AND
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

create policy "Managers can delete staff documents"
on storage.objects for delete
using (
  bucket_id = 'staff-docs' AND
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

create policy "Staff documents are viewable by managers"
on storage.objects for select
using (
  bucket_id = 'staff-docs' AND
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

-- Task Proofs Storage Policies
create policy "Staff can upload task proofs"
on storage.objects for insert
with check (
  bucket_id = 'task-proofs' AND
  exists (select 1 from public.users where auth_id = auth.uid() and role = 'staff')
);

create policy "Task proofs are viewable by everyone"
on storage.objects for select
using (
  bucket_id = 'task-proofs'
);

create policy "Managers can delete task proofs"
on storage.objects for delete
using (
  bucket_id = 'task-proofs' AND
  exists (select 1 from public.users where auth_id = auth.uid() and role in ('admin', 'manager', 'master'))
);

-- Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')) DEFAULT 'info',
    category TEXT CHECK (category IN ('attendance', 'advance', 'task', 'system')) DEFAULT 'system',
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users WHERE id = notifications.user_id AND auth_id = auth.uid()));

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.users WHERE id = notifications.user_id AND auth_id = auth.uid()));

CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_id = auth.uid() AND users.role IN ('admin', 'manager', 'master')
  )
);

-- Advance Requests Table
CREATE TABLE public.advance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Advance Requests
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own advance requests"
ON public.advance_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users WHERE id = advance_requests.user_id AND auth_id = auth.uid()));

CREATE POLICY "Users can insert their own advance requests"
ON public.advance_requests FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = advance_requests.user_id AND auth_id = auth.uid()));

CREATE POLICY "Managers can view all advance requests"
ON public.advance_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager', 'master')));

CREATE POLICY "Managers can update advance requests"
ON public.advance_requests FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role IN ('admin', 'manager', 'master')));

-- 8. USER SESSIONS TABLE (For PWA Persistence)
create table public.user_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  session_id uuid default uuid_generate_v4() unique not null,
  refresh_token text not null,
  user_agent text,
  last_used_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_sessions enable row level security;

-- Policies
create policy "Users can view own sessions" on public.user_sessions
  for select using (auth.uid() in (select auth_id from public.users where id = user_id));

create policy "Users can delete own sessions" on public.user_sessions
  for delete using (auth.uid() in (select auth_id from public.users where id = user_id));

-- Index for faster lookups in middleware
create index idx_user_sessions_session_id on public.user_sessions(session_id);
