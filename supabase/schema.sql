-- =============================================
-- Recall AI 智能错题本 - 数据库 Schema
-- =============================================

-- 用户设置表
create table public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nickname text default '',
  custom_cycles integer[] default '{1,3,7,15}',
  daily_max_review integer default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 错题本表
create table public.notebooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '我的错题本',
  subject text default '其他',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 错题表
create table public.mistakes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  notebook_id uuid references public.notebooks(id) on delete set null,
  content text not null,
  correct_answer text default '',
  wrong_answer text default '',
  wrong_reason text default '',
  subject text default '其他',
  tags text[] default '{}',
  mastery_level text default 'PARTIAL',
  image_url text,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 变式练习题表
create table public.practice_questions (
  id uuid default gen_random_uuid() primary key,
  mistake_id uuid references public.mistakes(id) on delete cascade not null,
  question text not null,
  standard_answer text default '',
  solution_steps text[] default '{}',
  created_at timestamptz default now()
);

-- 复习计划表
create table public.review_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mistake_id uuid references public.mistakes(id) on delete cascade not null,
  next_review_at timestamptz not null,
  stage integer default 0,
  mastery_level text default 'PARTIAL',
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 复习记录表
create table public.review_records (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.review_plans(id) on delete cascade not null,
  user_answer text default '',
  score integer default 0,
  feedback text default '',
  created_at timestamptz default now()
);

-- AI 使用量统计表
create table public.ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  ocr_count integer default 0,
  classify_count integer default 0,
  generate_count integer default 0,
  grade_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

-- =============================================
-- updated_at 自动更新触发器
-- =============================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_user_settings
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_notebooks
  before update on public.notebooks
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_mistakes
  before update on public.mistakes
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_review_plans
  before update on public.review_plans
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_ai_usage
  before update on public.ai_usage
  for each row execute function public.handle_updated_at();

-- =============================================
-- 安全策略 (RLS)
-- =============================================

-- 启用行级安全策略
alter table public.user_settings enable row level security;
alter table public.notebooks enable row level security;
alter table public.mistakes enable row level security;
alter table public.practice_questions enable row level security;
alter table public.review_plans enable row level security;
alter table public.review_records enable row level security;
alter table public.ai_usage enable row level security;

-- 用户设置策略
create policy "users_can_view_own_settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "users_can_update_own_settings" on public.user_settings
  for update using (auth.uid() = user_id);

create policy "users_can_insert_own_settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

-- 错题本策略
create policy "users_can_view_own_notebooks" on public.notebooks
  for select using (auth.uid() = user_id);

create policy "users_can_create_own_notebooks" on public.notebooks
  for insert with check (auth.uid() = user_id);

create policy "users_can_update_own_notebooks" on public.notebooks
  for update using (auth.uid() = user_id);

create policy "users_can_delete_own_notebooks" on public.notebooks
  for delete using (auth.uid() = user_id);

-- 错题策略
create policy "users_can_view_own_mistakes" on public.mistakes
  for select using (auth.uid() = user_id);

create policy "users_can_create_own_mistakes" on public.mistakes
  for insert with check (auth.uid() = user_id);

create policy "users_can_update_own_mistakes" on public.mistakes
  for update using (auth.uid() = user_id);

create policy "users_can_delete_own_mistakes" on public.mistakes
  for delete using (auth.uid() = user_id);

-- 复习计划策略
create policy "users_can_view_own_review_plans" on public.review_plans
  for select using (auth.uid() = user_id);

create policy "users_can_create_own_review_plans" on public.review_plans
  for insert with check (auth.uid() = user_id);

create policy "users_can_update_own_review_plans" on public.review_plans
  for update using (auth.uid() = user_id);

create policy "users_can_delete_own_review_plans" on public.review_plans
  for delete using (auth.uid() = user_id);

-- 复习记录策略
create policy "users_can_view_own_review_records" on public.review_records
  for select using (
    auth.uid() = (select user_id from public.review_plans where id = review_records.plan_id)
  );

create policy "users_can_create_own_review_records" on public.review_records
  for insert with check (
    auth.uid() = (select user_id from public.review_plans where id = review_records.plan_id)
  );

-- AI 使用量策略
create policy "users_can_view_own_ai_usage" on public.ai_usage
  for select using (auth.uid() = user_id);

create policy "users_can_insert_own_ai_usage" on public.ai_usage
  for insert with check (auth.uid() = user_id);

create policy "users_can_update_own_ai_usage" on public.ai_usage
  for update using (auth.uid() = user_id);

-- =============================================
-- 索引
-- =============================================

-- 单列索引
create index idx_mistakes_user_id on public.mistakes(user_id);
create index idx_mistakes_subject on public.mistakes(subject);
create index idx_mistakes_created_at on public.mistakes(created_at desc);
create index idx_review_plans_user_id on public.review_plans(user_id);
create index idx_review_plans_next_review on public.review_plans(next_review_at);
create index idx_review_plans_completed on public.review_plans(completed);
create index idx_notebooks_user_id on public.notebooks(user_id);

-- 复合索引（高频查询优化）
create index idx_review_plans_user_completed_next
  on public.review_plans(user_id, completed, next_review_at);
create index idx_mistakes_user_subject_archived
  on public.mistakes(user_id, subject, archived);
create index idx_ai_usage_user_date
  on public.ai_usage(user_id, date);

-- GIN 索引（数组类型查询）
create index idx_mistakes_tags_gin on public.mistakes USING GIN (tags);
