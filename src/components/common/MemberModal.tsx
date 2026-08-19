'use client';

import React, { useState } from 'react';
import { App } from 'antd';
import PaperButton from '../common/PaperButton';
import GhostButton from '../common/GhostButton';

interface MemberModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const FEATURES = [
  '无限错题录入额度',
  'AI 变式题无限生成',
  'AI 批改不限次数',
  '高级知识图谱分析',
  '专属墨雪形态解锁',
  '优先客服响应'
];

const PLANS = [
  { id: 'monthly', name: '月度会员', price: 29, period: '月', tag: '推荐体验' },
  { id: 'quarterly', name: '季度会员', price: 79, period: '3 月', tag: '省 8 元' },
  { id: 'yearly', name: '年度会员', price: 269, period: '年', tag: '最划算，省 79 元' }
];

export default function MemberModal({ open, onClose, reason }: MemberModalProps) {
  const { message: messageApi } = App.useApp();
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const handleSubscribe = async () => {
    setProcessing(true);
    try {
      messageApi.info('正在跳转支付页面...（演示模式）');
      setTimeout(() => {
        messageApi.success('订阅成功！');
        onClose();
        setProcessing(false);
      }, 1500);
    } catch (err: any) {
      messageApi.error('支付失败');
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(60, 58, 54, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="paper-card"
        style={{
          width: 560,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="link-paper"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 20,
            fontSize: '18pt',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 8 }}>
            升级为 Recall AI 会员
          </h2>
          {reason && (
            <p style={{ fontSize: '12pt', color: 'var(--danger-red)', margin: 0 }}>
              {reason}
            </p>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div
            className="text-label"
            style={{ marginBottom: 12, fontSize: '12pt', color: 'var(--text-main)' }}
          >
            会员专属权益
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ fontSize: '12pt', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--success-green)' }}>☑</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div
            className="text-label"
            style={{ marginBottom: 12, fontSize: '12pt', color: 'var(--text-main)' }}
          >
            选择套餐
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{
                  padding: 16,
                  border: `2px solid ${selectedPlan === plan.id ? 'var(--brand-primary)' : 'var(--border-line)'}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.2s',
                  backgroundColor: selectedPlan === plan.id ? 'rgba(45, 74, 62, 0.05)' : 'transparent'
                }}
              >
                <div style={{ fontSize: '14pt', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
                  ¥{plan.price}
                </div>
                <div style={{ fontSize: '12pt', color: 'var(--text-secondary)', margin: '4px 0' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '10pt', color: 'var(--warning-gold)' }}>
                  {plan.tag}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            paddingTop: 16,
            borderTop: '1px solid var(--border-line)'
          }}
        >
          <GhostButton onClick={onClose}>暂不考虑</GhostButton>
          <PaperButton onClick={handleSubscribe} disabled={processing}>
            {processing ? '处理中...' : '立即升级'}
          </PaperButton>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '10pt',
            color: 'var(--text-secondary)',
            marginTop: 16,
            margin: '12px 0 0'
          }}
        >
          AI 生成内容仅供练习参考 · 订阅成功后即时生效
        </p>
      </div>
    </div>
  );
}
