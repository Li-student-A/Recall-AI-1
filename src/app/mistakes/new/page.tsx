'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Upload, Select } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { supabaseClient } from '@/lib/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PageContainer from '@/components/layout/PageContainer';
import PaperCard from '@/components/common/PaperCard';
import PaperButton from '@/components/common/PaperButton';
import GhostButton from '@/components/common/GhostButton';
import { SUBJECTS, MASTERY_LEVELS } from '@/lib/constants';

const { Dragger } = Upload;

export default function NewMistakePage() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState('');
  const [content, setContent] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [wrongReason, setWrongReason] = useState('');
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [masteryLevel, setMasteryLevel] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      // 读取为 base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      });

      // 获取当前用户的 access_token，用于 API 鉴权
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';

      const response = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ image: base64, filename: file.name })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `OCR 识别失败（${response.status}）`);
      }

      const data = await response.json();
      setOcrResult(data.text || '');
      setContent(data.text || '');

      if (data.tags && data.tags.length > 0) {
        setTags((prev) => [...new Set([...prev, ...data.tags])]);
      }
      messageApi.success('OCR 识别完成 ✓');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('401') || msg.includes('未登录')) {
        messageApi.error('登录已过期，请重新登录后再试');
      } else if (msg.includes('OCR 服务未配置')) {
        messageApi.warning('OCR 服务尚未配置，请手动输入题干');
        setContent('');
      } else {
        messageApi.error(`图片识别失败：${msg || '未知错误'}，请手动输入`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      messageApi.warning('请填写题干内容');
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();

      // 登录态检查：未登录直接跳转，避免用 undefined user_id 插入被 RLS 拒绝
      if (!user) {
        messageApi.error('登录状态已过期，请重新登录');
        router.push('/auth/login');
        return;
      }

      const userId = user.id;

      // 未选掌握程度时默认 TOTAL（完全不会），保证每道错题都有可计算的 mastery_level
      const finalMasteryLevel = masteryLevel || 'TOTAL';

      const { data, error } = await supabaseClient
        .from('mistakes')
        .insert({
          user_id: userId,
          content,
          correct_answer: correctAnswer,
          wrong_answer: wrongAnswer,
          wrong_reason: wrongReason,
          subject,
          tags,
          mastery_level: finalMasteryLevel,
          archived: false
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('permission denied')) {
          throw new Error('权限不足，请退出后重新登录');
        }
        throw error;
      }

      messageApi.success('错题已保存 🎉');

      // 始终创建复习计划：首次复习定在"今天"，录入后立即出现在今日复习清单
      // （失败不阻断主流程，但会打 warn，便于排查）
      if (data) {
        try {
          const { calculateReviewPlan } = await import('@/lib/ebbinghaus');
          const plan = calculateReviewPlan(data.id, finalMasteryLevel as any);
          const { error: planError } = await supabaseClient.from('review_plans').insert({
            user_id: userId,
            mistake_id: data.id,
            next_review_at: plan.nextReviewAt,
            stage: plan.stage,
            mastery_level: plan.masteryLevel,
            completed: false
          });
          if (planError) console.warn('复习计划创建失败:', planError.message);
        } catch (planErr) {
          console.warn('复习计划模块异常:', planErr);
        }
      }

      router.push('/mistakes');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('permission denied')) {
        messageApi.error('保存失败：权限不足，请退出后重新登录');
      } else if (msg.includes('Invalid path') || msg.includes('request URL')) {
        messageApi.error('服务器连接失败，请检查网络');
      } else if (msg.includes('duplicate')) {
        messageApi.warning('该错题可能已存在');
      } else {
        messageApi.error(`保存失败：${msg || '未知错误'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    const draft = {
      content,
      correctAnswer,
      wrongAnswer,
      wrongReason,
      subject,
      tags,
      masteryLevel,
      savedAt: Date.now()
    };
    localStorage.setItem('recall_mistake_draft', JSON.stringify(draft));
    messageApi.success('草稿已保存');
  };

  const handleClearDraft = () => {
    if (confirm('确定清空草稿吗？')) {
      localStorage.removeItem('recall_mistake_draft');
      setContent('');
      setCorrectAnswer('');
      setWrongAnswer('');
      setWrongReason('');
      setTags([]);
      setMasteryLevel('');
      setOcrResult('');
      messageApi.info('草稿已清空');
    }
  };

  return (
    <AppLayout>
      <PageContainer
        title="新增错题"
        extra={
          <div style={{ display: 'flex', gap: 12 }}>
            <GhostButton onClick={handleClearDraft}>清空草稿</GhostButton>
            <GhostButton onClick={handleSaveDraft}>保存草稿</GhostButton>
          </div>
        }
      >
        {/* 上传模块 */}
        <PaperCard style={{ marginBottom: 20 }}>
          <div className="section-title">1. 图片上传与 OCR 识别</div>
          <Dragger
            name="file"
            multiple={false}
            accept=".jpg,.jpeg,.png,.webp"
            showUploadList={false}
            customRequest={async ({ file, onSuccess, onError }) => {
              try {
                await handleUpload(file as File);
                onSuccess?.({});
              } catch (err) {
                onError?.(err as any);
              }
            }}
            style={{ borderColor: 'var(--border-line)' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: 'var(--brand-primary)' }} />
            </p>
            <p className="ant-upload-text">点击或拖拽上传试卷 / 作业截图</p>
            <p className="ant-upload-hint" style={{ color: 'var(--text-secondary)' }}>
              支持 JPG、PNG、WebP 格式
            </p>
          </Dragger>
          {uploading && (
            <div style={{ marginTop: 12, color: 'var(--brand-primary)' }}>
              正在识别中...
            </div>
          )}
          {ocrResult && !uploading && (
            <div style={{ marginTop: 12, color: 'var(--success-green)' }}>
              ✓ 识别完成，可在下方编辑题干
            </div>
          )}
        </PaperCard>

        {/* 错题信息编辑 */}
        <PaperCard style={{ marginBottom: 20 }}>
          <div className="section-title">2. 错题信息编辑</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                题干
              </label>
              <textarea
                className="input-paper"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入或编辑题干内容（支持 OCR 识别结果编辑）"
                rows={4}
                style={{
                  resize: 'vertical',
                  borderBottom: '1px solid var(--border-line)',
                  padding: '12px 4px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                  正确答案
                </label>
                <textarea
                  className="input-paper"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="正确解法或答案"
                  rows={2}
                  style={{ resize: 'vertical', borderBottom: '1px solid var(--border-line)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                  错误答案
                </label>
                <textarea
                  className="input-paper"
                  value={wrongAnswer}
                  onChange={(e) => setWrongAnswer(e.target.value)}
                  placeholder="自己的错误解法"
                  rows={2}
                  style={{ resize: 'vertical', borderBottom: '1px solid var(--border-line)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                错误原因
              </label>
              <textarea
                className="input-paper"
                value={wrongReason}
                onChange={(e) => setWrongReason(e.target.value)}
                placeholder="分析错误原因，便于后续针对性复习"
                rows={2}
                style={{ resize: 'vertical', borderBottom: '1px solid var(--border-line)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                  学科分类
                </label>
                <Select
                  value={subject}
                  onChange={setSubject}
                  style={{ width: '100%' }}
                  options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                />
              </div>
              <div>
                <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                  掌握程度
                </label>
                <Select
                  value={masteryLevel || undefined}
                  onChange={setMasteryLevel}
                  style={{ width: '100%' }}
                  placeholder="选择掌握程度"
                  options={Object.entries(MASTERY_LEVELS).map(([key, v]) => ({
                    value: key,
                    label: v.label
                  }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                知识点标签
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '2px 8px',
                      border: '1px solid var(--border-line)',
                      borderRadius: 4,
                      fontSize: '12pt',
                      color: 'var(--text-main)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-paper"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="输入自定义标签，回车添加"
                  style={{ flex: 1 }}
                />
                <GhostButton onClick={handleAddTag} style={{ padding: '4px 16px' }}>
                  添加
                </GhostButton>
              </div>
            </div>
          </div>
        </PaperCard>

        {/* 底部操作区 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '10pt', color: 'var(--text-secondary)' }}>
            草稿自动本地缓存，清除浏览器数据会丢失未保存内容
          </div>
          <PaperButton onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '存入错题本'}
          </PaperButton>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
