-- =============================================
-- Recall AI 智能错题本 - RLS 策略完整修复 SQL
-- 直接在 Supabase SQL Editor 中执行
-- =============================================

-- === 确保所有表都启用了 RLS ===
alter table public.user_settings enable row level security;
alter table public.notebooks enable row level security;
alter table public.mistakes enable row level security;
alter table public.practice_questions enable row level security;
alter table public.review_plans enable row level security;
alter table public.review_records enable row level security;
alter table public.ai_usage enable row level security;

-- === 先清理可能的旧策略 ===
drop policy if exists "users_can_view_own_settings" on public.user_settings;
drop policy if exists "users_can_update_own_settings" on public.user_settings;
drop policy if exists "users_can_insert_own_settings" on public.user_settings;
drop policy if exists "users_can_view_own_notebooks" on public.notebooks;
drop policy if exists "users_can_create_own_notebooks" on public.notebooks;
drop policy if exists "users_can_update_own_notebooks" on public.notebooks;
drop policy if exists "users_can_delete_own_notebooks" on public.notebooks;
drop policy if exists "users_can_view_own_mistakes" on public.mistakes;
drop policy if exists "users_can_create_own_mistakes" on public.mistakes;
drop policy if exists "users_can_update_own_mistakes" on public.mistakes;
drop policy if exists "users_can_delete_own_mistakes" on public.mistakes;
drop policy if exists "users_can_view_own_review_plans" on public.review_plans;
drop policy if exists "users_can_create_own_review_plans" on public.review_plans;
drop policy if exists "users_can_update_own_review_plans" on public.review_plans;
drop policy if exists "users_can_view_own_ai_usage" on public.ai_usage;
drop policy if exists "users_can_insert_own_ai_usage" on public.ai_usage;
drop policy if exists "users_can_update_own_ai_usage" on public.ai_usage;

-- === 1. user_settings ===
create policy "users_can_view_own_settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "users_can_insert_own_settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy "users_can_update_own_settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- === 2. notebooks ===
create policy "notebooks_select" on public.notebooks
  for select using (auth.uid() = user_id);

create policy "notebooks_insert" on public.notebooks
  for insert with check (auth.uid() = user_id);

create policy "notebooks_update" on public.notebooks
  for update using (auth.uid() = user_id);

create policy "notebooks_delete" on public.notebooks
  for delete using (auth.uid() = user_id);

-- === 3. mistakes（关键修复点）===
create policy "mistakes_select" on public.mistakes
  for select using (auth.uid() = user_id);

create policy "mistakes_insert" on public.mistakes
  for insert with check (
    auth.uid() = user_id
    and user_id = auth.uid()
  );

create policy "mistakes_update" on public.mistakes
  for update using (auth.uid() = user_id);

create policy "mistakes_delete" on public.mistakes
  for delete using (auth.uid() = user_id);

-- === 4. practice_questions ===
create policy "practice_questions_select" on public.practice_questions
  for select using (
    exists (
      select 1 from public.mistakes m
      where m.id = practice_questions.mistake_id
      and m.user_id = auth.uid()
    )
  );

create policy "practice_questions_insert" on public.practice_questions
  for insert with check (
    exists (
      select 1 from public.mistakes m
      where m.id = practice_questions.mistake_id
      and m.user_id = auth.uid()
    )
  );

create policy "practice_questions_update" on public.practice_questions
  for update using (
    exists (
      select 1 from public.mistakes m
      where m.id = practice_questions.mistake_id
      and m.user_id = auth.uid()
    )
  );

create policy "practice_questions_delete" on public.practice_questions
  for delete using (
    exists (
      select 1 from public.mistakes m
      where m.id = practice_questions.mistake_id
      and m.user_id = auth.uid()
    )
  );

-- === 5. review_plans ===
create policy "review_plans_select" on public.review_plans
  for select using (auth.uid() = user_id);

create policy "review_plans_insert" on public.review_plans
  for insert with check (auth.uid() = user_id);

create policy "review_plans_update" on public.review_plans
  for update using (auth.uid() = user_id);

create policy "review_plans_delete" on public.review_plans
  for delete using (auth.uid() = user_id);

-- === 6. review_records ===
create policy "review_records_select" on public.review_records
  for select using (
    exists (
      select 1 from public.review_plans p
      where p.id = review_records.plan_id
      and p.user_id = auth.uid()
    )
  );

create policy "review_records_insert" on public.review_records
  for insert with check (
    exists (
      select 1 from public.review_plans p
      where p.id = review_records.plan_id
      and p.user_id = auth.uid()
    )
  );

-- === 7. ai_usage ===
create policy "ai_usage_select" on public.ai_usage
  for select using (auth.uid() = user_id);

create policy "ai_usage_insert" on public.ai_usage
  for insert with check (auth.uid() = user_id);

create policy "ai_usage_update" on public.ai_usage
  for update using (auth.uid() = user_id);

-- 执行完成后显示确认信息
select 'RLS policies recreated successfully for Recall AI' as result;
