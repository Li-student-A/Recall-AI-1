import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { calculateReviewPlan } from '@/lib/ebbinghaus';
import type { Mistake } from '@/lib/types';

// 允许通过 POST 创建的字段白名单
const MISTAKE_CREATE_FIELDS = [
  'notebook_id', 'content', 'correct_answer', 'wrong_answer',
  'wrong_reason', 'subject', 'tags', 'mastery_level', 'image_url'
] as const;

// 允许通过 PUT 更新的字段白名单
const MISTAKE_UPDATE_FIELDS = [
  'content', 'correct_answer', 'wrong_answer', 'wrong_reason',
  'subject', 'tags', 'mastery_level', 'image_url', 'archived'
] as const;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const masteryLevel = searchParams.get('mastery_level');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    let query = supabaseServer
      .from('mistakes')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (subject) query = query.eq('subject', subject);
    if (masteryLevel) query = query.eq('mastery_level', masteryLevel);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data, count, page, totalPages: Math.ceil((count || 0) / limit) });
  } catch (err) {
    return NextResponse.json({ error: '获取错题列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const body = await request.json();

    // 只允许白名单字段
    const insertData: Record<string, unknown> = { user_id: user.id };
    for (const field of MISTAKE_CREATE_FIELDS) {
      if (body[field] !== undefined) {
        insertData[field] = body[field];
      }
    }

    const { data, error } = await supabaseServer
      .from('mistakes')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // 自动创建复习计划
    const mistake = data as Mistake;
    const masteryLevel = (mistake.mastery_level || 'PARTIAL') as 'TOTAL' | 'PARTIAL' | 'CARELESS';
    const plan = calculateReviewPlan(mistake.id, masteryLevel, 0);

    await supabaseServer.from('review_plans').insert({
      user_id: user.id,
      mistake_id: mistake.id,
      next_review_at: plan.nextReviewAt,
      stage: plan.stage,
      mastery_level: masteryLevel,
      completed: false
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: '创建错题失败' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id, ...body } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺少错题 ID' }, { status: 400 });
    }

    // 只允许白名单字段
    const updates: Record<string, unknown> = {};
    for (const field of MISTAKE_UPDATE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabaseServer
      .from('mistakes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // 确保只能更新自己的错题
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: '更新错题失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺少错题 ID' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('mistakes')
      .update({ archived: true })
      .eq('id', id)
      .eq('user_id', user.id); // 确保只能删除自己的错题

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: '删除错题失败' }, { status: 500 });
  }
}
