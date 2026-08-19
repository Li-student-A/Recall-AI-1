'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_CONFIG } from '@/lib/constants';

const navItems = [
  { href: '/dashboard', label: '首页' },
  { href: '/mistakes', label: '错题本' },
  { href: '/practice', label: 'AI 练习' },
  { href: '/calendar', label: '复习日历' },
  { href: '/settings', label: '设置' }
];

interface SidebarProps {
  userEmail?: string;
  memberLevel?: string;
}

export default function Sidebar({ userEmail, memberLevel = '免费版' }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>{APP_CONFIG.name}</h1>
        <p>错题重温・日拱一卒</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div>{userEmail || '未登录'}</div>
        <span className="member-tag">{memberLevel}</span>
      </div>
    </aside>
  );
}
