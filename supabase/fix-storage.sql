-- =============================================
-- Recall AI 智能错题本 - Storage Bucket 初始化
-- 在 Supabase SQL Editor 中执行（RLS 修复脚本之后）
-- =============================================

-- Step 1: 创建错题图片存储 bucket（公开读）
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'mistakes',
  'mistakes',
  true,
  true,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: 删除 storage.objects 中已有的 mistakes 相关策略（避免命名冲突）
DROP POLICY IF EXISTS "mistakes_select_own" ON storage.objects;
DROP POLICY IF EXISTS "mistakes_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "mistakes_update_own" ON storage.objects;
DROP POLICY IF EXISTS "mistakes_delete_own" ON storage.objects;

-- Step 3: 给 mistakes bucket 授权
-- 用户只能查看自己上传的图片（即使 bucket 是 public，也通过 RLS 限制访问）
CREATE POLICY "mistakes_select_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'mistakes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用户只能上传自己子目录下的文件 (mistakes/{user_id}/xxx)
CREATE POLICY "mistakes_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'mistakes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用户只能修改自己的文件
CREATE POLICY "mistakes_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'mistakes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'mistakes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 用户只能删除自己的文件
CREATE POLICY "mistakes_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'mistakes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 完成确认
SELECT 'Storage bucket "mistakes" 初始化完成（支持 JPG/PNG/WebP，单文件 ≤50MB）' as status;
