# Recall AI 智能错题本 Web 端 MVP

> **错题重温・日拱一卒** — 面向大学生/考研备考人群的 AI 驱动错题复盘学习工具

## 项目概述

Recall AI 是一款基于 Next.js + Supabase 的全栈 Web 应用，核心功能涵盖：

- 📷 **拍照 OCR 录入** — 百度 OCR 自动识别题干、公式
- 🤖 **AI 智能归类** — DeepSeek 自动打三级标签（学科→知识点→错误类型）
- 📝 **变式巩固练习** — AI 实时生成同源变式题，自动批改
- 📅 **艾宾浩斯复习** — 科学遗忘曲线自动规划复习节奏
- 📊 **知识看板** — 可视化学习数据统计
- 🦊 **墨雪陪伴** — AI 书灵宠物激励学习

## 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端框架 | Next.js 14 (App Router) | SSR/SSG、路由管理、API Routes |
| 语言 | TypeScript 5 | 类型安全 |
| UI 组件 | Ant Design 5 | 复古纸张质感定制主题 |
| 数据库 | Supabase (PostgreSQL) | 数据存储、Auth、Storage |
| 图像 AI | 百度 OCR | 文字/公式识别 |
| 大模型 | DeepSeek-V3 | 知识点分类、变式生成、AI 批改 |
| 公式渲染 | KaTeX | LaTeX 数学公式 |
| 部署 | Vercel | 前端 + 后端 API 托管 |

## 快速开始

### 1. 环境要求

- Node.js ≥ 18
- npm ≥ 9
- Supabase 账号（免费）
- 百度 OCR 账号（免费额度）
- DeepSeek API Key

### 2. 安装与配置

```bash
# 进入项目目录
cd recall-ai

# 安装依赖
npm install

# 复制环境变量模板
cp .env.local.example .env.local

# 编辑 .env.local，填入实际配置
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - BAIDU_OCR_API_KEY
# - BAIDU_OCR_SECRET
# - DEEPSEEK_API_KEY
```

### 3. 数据库初始化

在 Supabase SQL Editor 中执行 [supabase/schema.sql](./supabase/schema.sql) 创建所有表和权限策略。

同时需要在 Supabase Dashboard 中执行 [supabase/fix-storage.sql](./supabase/fix-storage.sql) 创建 Storage Bucket：
- 名称：`mistakes`
- 权限：Public（允许公开读取图片），支持 JPG/PNG/WebP（≤50MB）

### 4. 启动开发

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 其他命令

```bash
# 代码检查
npm run lint

# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 启动生产服务
npm start
```

## 项目结构

```
recall-ai/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页路由
│   │   ├── globals.css         # 全局复古样式
│   │   ├── auth/               # 登录/注册页
│   │   ├── dashboard/          # 首页复习看板
│   │   ├── mistakes/           # 错题本列表/录入
│   │   ├── practice/           # AI 练习页
│   │   ├── calendar/           # 复习日历
│   │   ├── settings/           # 设置页
│   │   └── api/                # API Routes
│   ├── components/
│   │   ├── layout/             # 布局组件（侧边栏等）
│   │   ├── common/             # 通用组件（按钮、卡片等）
│   │   ├── mistakes/           # 错题相关组件
│   │   ├── practice/           # 练习相关组件
│   │   ├── calendar/           # 日历组件
│   │   ├── settings/           # 设置组件
│   │   ├── effects/            # 特效组件（毛笔光标、墨雪宠物）
│   │   └── error/              # 错误边界
│   ├── lib/
│   │   ├── supabase/           # Supabase 客户端
│   │   ├── api/                # API 调用封装
│   │   ├── ebbinghaus.ts       # 艾宾浩斯引擎
│   │   └── constants.ts        # 常量配置
│   └── styles/
│       └── theme.ts            # Ant Design 复古主题
├── supabase/
│   └── schema.sql              # 数据库 Schema
├── docs/
│   ├── test-cases-stage0.md    # 阶段 0 测试用例
│   ├── test-cases-stage1.md    # 阶段 1 测试用例
│   ├── test-cases-stage2.md    # 阶段 2 测试用例
│   └── test-cases-stage3.md    # 阶段 3 测试用例
├── vercel.json                 # Vercel 部署配置
├── next.config.js              # Next.js 配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 项目依赖
```

## 功能模块

### 阶段 0：基础设施 ✅
- Next.js + TypeScript 项目初始化
- Supabase 数据库 Schema 与 RLS 策略
- 登录/注册/会话持久化
- Ant Design 复古纸张质感主题
- 全局侧边布局
- Vercel 部署配置

### 阶段 1：错题录入 ✅
- 错题本 CRUD
- 图片上传与存储
- 百度 OCR 文字识别
- DeepSeek AI 标签分类
- 三步录入流程（上传→编辑→保存）
- 本地草稿缓存

### 阶段 2：AI 练习模块 ✅
- 错题列表/筛选/分页
- 错题详情弹窗
- 批量归档操作
- AI 变式题生成
- AI 自动批改
- 练习页双栏 UI
- AI 用量限额管控

### 阶段 3：完整复习闭环 ✅
- 艾宾浩斯复习引擎
- Vercel Cron 定时任务
- 首页复习看板
- 复习日历月历
- 墨雪宠物 + 进化解锁
- 毛笔流星光标特效
- 设置页全功能
- 全局异常兜底
- 平板/手机响应式
- 会员付费弹窗

## 设计规范

本产品严格遵循 UI/UX 设计文档 V2.1 的"纸张质感"设计原则：

- **纸张底色**：#F9F6F0
- **品牌主色**：#2D4A3E（墨绿）
- **危险强调**：#B33939（复古红）
- **成功完成**：#5B7A5A
- **卡片边框**：#E2DCD3
- **字体**：Georgia 衬线标题 + system-ui 正文
- **组件**：4px 微圆角、1px 细边框、无厚重投影

## 部署

### Vercel 一键部署

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量（参考 `.env.local.example`）
4. 点击 Deploy

### 环境变量清单

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目地址 | Supabase Dashboard |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名 Key | Supabase Dashboard |
| SUPABASE_SERVICE_ROLE_KEY | Service Role Key | Supabase Dashboard |
| BAIDU_OCR_API_KEY | 百度 OCR API Key | [百度智能云](https://ai.baidu.com/) |
| BAIDU_OCR_SECRET | 百度 OCR Secret | [百度智能云](https://ai.baidu.com/) |
| DEEPSEEK_API_KEY | DeepSeek API Key | [DeepSeek](https://platform.deepseek.com/) |

## AI 合规声明

本产品所有 AI 生成内容均标注「AI 生成，仅供练习参考」，遵循《生成式人工智能服务管理暂行办法》要求。面向 18 岁以上成年用户，不主动收集未成年人信息。

## License

本项目为 MVP 验证阶段，版权归原作者所有。
