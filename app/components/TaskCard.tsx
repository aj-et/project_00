'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { Task } from '../types';

type Props = {
  task: Task;
  viewDate: Date;
  currentTime: number;
  onClick: () => void;
  onComplete: () => void;
  onDelete: () => void;
};

function formatTime(h: number, m: number) {
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function localDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isMissedTask(task: Task, viewDate: Date, currentTime: number) {
  if (task.completed) return false;
  const todayKey = localDateKey(new Date());
  const viewKey = localDateKey(viewDate);
  if (viewKey < todayKey) return true;
  if (viewKey === todayKey) return task.toHour * 60 + task.toMinute < currentTime;
  return false;
}

const REPEAT_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', weekdays: 'Weekdays', weekends: 'Weekends',
};

export default function TaskCard({ task, viewDate, currentTime, onClick, onComplete, onDelete }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const missed = isMissedTask(task, viewDate, currentTime);

  function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    const el = wrapperRef.current;
    if (!el) { onComplete(); return; }
    // Bounce the check, then slide card left toward history sidebar
    gsap.to(checkRef.current, { scale: 1.4, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
    gsap.to(el, {
      opacity: 0, x: -50, height: 0,
      paddingTop: 0, paddingBottom: 0, marginBottom: 0,
      duration: 0.32, delay: 0.1, ease: 'power2.in',
      onComplete: onComplete,
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    const el = wrapperRef.current;
    if (!el) { onDelete(); return; }
    gsap.to(el, {
      opacity: 0, x: 40, height: 0,
      paddingTop: 0, paddingBottom: 0, marginBottom: 0,
      duration: 0.28, ease: 'power2.in',
      onComplete: onDelete,
    });
  }

  return (
    <div
      ref={wrapperRef}
      className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-3 transition-colors dark:bg-neutral-900 mb-2 overflow-hidden ${
        missed
          ? 'border-rose-100 dark:border-rose-900/40'
          : 'border-neutral-100 hover:border-neutral-200 dark:border-neutral-800 dark:hover:border-neutral-700'
      }`}
    >
      {/* Color accent bar */}
      <div className={`h-10 w-1 shrink-0 rounded-full ${task.color}`} />

      {/* Content — click to edit */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {task.title}
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {formatTime(task.fromHour, task.fromMinute)} → {formatTime(task.toHour, task.toMinute)}
          {task.repeat !== 'none' && (
            <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {REPEAT_LABELS[task.repeat]}
            </span>
          )}
          {missed && (
            <span className="ml-1.5 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-400 dark:bg-rose-950/50">
              Missed
            </span>
          )}
        </p>
        {task.description && (
          <p className="text-xs text-neutral-400 mt-0.5 truncate">{task.description}</p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          ref={checkRef}
          onClick={handleComplete}
          title="Mark complete"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-950"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 8.5L6 12l7-8" />
          </svg>
        </button>

        <button
          onClick={handleDelete}
          title="Delete task"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-300 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.5a.5.5 0 0 0 0 1H3v9.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V4.5h.5a.5.5 0 0 0 0-1H11Zm-6.5 1h7v9.5a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5V3.5Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
