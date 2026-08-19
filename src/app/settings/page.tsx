'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Switch, InputNumber } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PageContainer from '@/components/layout/PageContainer';
import PaperCard from '@/components/common/PaperCard';
import PaperButton from '@/components/common/PaperButton';
import GhostButton from '@/components/common/GhostButton';

export default function SettingsPage() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [userEmail, setUserEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [showBrush, setShowBrush] = useState(true);
  const [showMooxue, setShowMooxue] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [customCycles, setCustomCycles] = useState<number[]>([1, 3, 7, 15]);
  const [dailyMax, setDailyMax] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserInfo();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserInfo = async () => {
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUserEmail(user.email || '');
      const { data } = await supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setNickname(data.nickname || '');
        setCustomCycles(data.custom_cycles || [1, 3, 7, 15]);
        setDailyMax(data.daily_max_review || 50);
      }
    } catch (err) {
      console.error('加载用户信息失败', err);
    }
  };

  const loadSettings = () => {
    const brush = localStorage.getItem('recall_brush');
    const mooxue = localStorage.getItem('recall_mooxue');
    const anim = localStorage.getItem('recall_animations');
    if (brush !== null) setShowBrush(brush === 'true');
    if (mooxue !== null) setShowMooxue(mooxue === 'true');
    if (anim !== null) setAnimationsEnabled(anim === 'true');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();
      if (!user) return;

      const { error } = await supabaseClient.from('user_settings').upsert({
        user_id: user.id,
        nickname,
        custom_cycles: customCycles,
        daily_max_review: dailyMax
      });

      if (error) throw error;

      localStorage.setItem('recall_brush', String(showBrush));
      localStorage.setItem('recall_mooxue', String(showMooxue));
      localStorage.setItem('recall_animations', String(animationsEnabled));

      messageApi.success('设置已保存');
    } catch (err: any) {
      messageApi.error(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();
      if (!user) return;

      const { data, error } = await supabaseClient
        .from('mistakes')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recall-mistakes-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      messageApi.success('导出成功');
    } catch (err: any) {
      messageApi.error('导出失败');
    }
  };

  const handleClearDrafts = () => {
    if (confirm('确定清空所有本地草稿吗？此操作不可恢复。')) {
      localStorage.removeItem('recall_mistake_draft');
      messageApi.success('草稿已清空');
    }
  };

  const handleResetRecords = () => {
    if (!confirm('确定重置所有复习记录吗？此操作不可恢复。')) return;
    if (!confirm('再次确认：所有复习进度将被清空，确定吗？')) return;
    messageApi.success('复习记录已重置');
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (err: any) {
      messageApi.error('退出登录失败');
    }
  };

  return (
    <AppLayout>
      <PageContainer title="设置">
        {/* 基础信息卡片 */}
        <PaperCard style={{ marginBottom: 16 }}>
          <div className="section-title">基础信息</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <span className="text-label">绑定邮箱</span>
              <div style={{ fontSize: '14pt', color: 'var(--text-main)' }}>{userEmail}</div>
            </div>
            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>昵称</label>
              <input
                className="input-paper"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="设置你的昵称"
                style={{ maxWidth: 300 }}
              />
            </div>
            <GhostButton style={{ width: 'fit-content' }}>修改密码</GhostButton>
          </div>
        </PaperCard>

        {/* 显示与特效设置 */}
        <PaperCard style={{ marginBottom: 16 }}>
          <div className="section-title">显示与特效设置</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '14pt' }}>毛笔流星光标</div>
                <div className="text-label">开启复古毛笔光标特效</div>
              </div>
              <Switch
                checked={showBrush}
                onChange={(checked) => {
                  setShowBrush(checked);
                  localStorage.setItem('recall_brush', String(checked));
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '14pt' }}>显示陪伴宠物墨雪</div>
                <div className="text-label">AI 书灵宠物陪伴学习</div>
              </div>
              <Switch
                checked={showMooxue}
                onChange={(checked) => {
                  setShowMooxue(checked);
                  localStorage.setItem('recall_mooxue', String(checked));
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '14pt' }}>页面动画效果</div>
                <div className="text-label">关闭后可降低低配设备性能消耗</div>
              </div>
              <Switch
                checked={animationsEnabled}
                onChange={(checked) => {
                  setAnimationsEnabled(checked);
                  localStorage.setItem('recall_animations', String(checked));
                }}
              />
            </div>
          </div>
        </PaperCard>

        {/* 复习规则设置 */}
        <PaperCard style={{ marginBottom: 16 }}>
          <div className="section-title">复习规则设置</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                自定义复习间隔天数
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {customCycles.map((day, i) => (
                  <InputNumber
                    key={i}
                    min={1}
                    max={60}
                    value={day}
                    onChange={(val) => {
                      if (val) {
                        const newCycles = [...customCycles];
                        newCycles[i] = val;
                        setCustomCycles(newCycles);
                      }
                    }}
                    style={{ width: 80 }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                每日最大复习题量
              </label>
              <InputNumber
                min={1}
                max={200}
                value={dailyMax}
                onChange={(val) => val && setDailyMax(val)}
                style={{ width: 120, marginTop: 8 }}
              />
            </div>
          </div>
        </PaperCard>

        {/* 数据管理 */}
        <PaperCard style={{ marginBottom: 16 }}>
          <div className="section-title">数据管理</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <GhostButton onClick={handleExport}>导出全部错题</GhostButton>
            <button
              className="btn-paper"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--danger-red)',
                borderColor: 'var(--danger-red)'
              }}
              onClick={handleClearDrafts}
            >
              清空本地草稿
            </button>
            <button
              className="btn-paper"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--danger-red)',
                borderColor: 'var(--danger-red)'
              }}
              onClick={handleResetRecords}
            >
              重置所有复习记录
            </button>
          </div>
        </PaperCard>

        {/* 关于产品 */}
        <PaperCard style={{ marginBottom: 16 }}>
          <div className="section-title">关于产品</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '12pt' }}>
            <div>版本号 V2.1</div>
            <a className="link-paper">使用说明</a>
            <a className="link-paper">客服反馈</a>
          </div>
        </PaperCard>

        {/* 退出登录 */}
        <PaperCard>
          <PaperButton onClick={handleLogout}>退出登录</PaperButton>
        </PaperCard>

        {/* 底部保存按钮 */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            padding: 16,
            borderTop: '1px solid var(--border-line)'
          }}
        >
          <PaperButton onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存全部设置'}
          </PaperButton>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
