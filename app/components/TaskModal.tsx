'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Task, RepeatOption } from '../types';

export type { Task };

type Props = {
  task: Task | null;
  defaultDate?: Date;
  defaultHour?: number;
  onSave: (task: Omit<Task, 'id' | 'completed'>, targetDate: Date) => void;
  onDelete: () => void;
  onDeleteAll?: () => void;
  onClose: () => void;
};

const COLORS = [
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Emerald', value: 'bg-emerald-500' },
  { label: 'Amber', value: 'bg-amber-500' },
  { label: 'Rose', value: 'bg-rose-500' },
  { label: 'Sky', value: 'bg-sky-500' },
  { label: 'Violet', value: 'bg-violet-500' },
];

const REPEAT_OPTIONS: { label: string; value: RepeatOption }[] = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Custom', value: 'custom' },
];

// [label, JS weekday index] in Mon–Sun display order
const WEEK_DAYS: [string, number][] = [
  ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6], ['S', 0],
];

const MINUTES = [0, 15, 30, 45];

function pad(n: number) { return String(n).padStart(2, '0'); }

function hourLabel(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function localDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function TaskModal({ task, defaultDate, defaultHour, onSave, onDelete, onDeleteAll, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const initHour = task?.fromHour ?? defaultHour ?? Math.max(new Date().getHours(), 9);
  const initDateStr = localDateStr(defaultDate ?? new Date());

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [color, setColor] = useState(task?.color ?? COLORS[0].value);
  const [selectedDateStr, setSelectedDateStr] = useState(initDateStr);
  const [fromHour, setFromHour] = useState(task?.fromHour ?? initHour);
  const [fromMinute, setFromMinute] = useState(task?.fromMinute ?? 0);
  const [toHour, setToHour] = useState(task?.toHour ?? Math.min(initHour + 1, 23));
  const [toMinute, setToMinute] = useState(task?.toMinute ?? 0);
  const [repeat, setRepeat] = useState<RepeatOption>(task?.repeat ?? 'none');
  const [repeatDays, setRepeatDays] = useState<number[]>(task?.repeatDays ?? []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(modalRef.current,
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.4)' }
      );
    });
    return () => ctx.revert();
  }, []);

  function close() {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.15 });
    gsap.to(modalRef.current, { opacity: 0, y: 20, scale: 0.95, duration: 0.2, onComplete: onClose });
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave(
      { title: title.trim(), description: description.trim(), color, fromHour, fromMinute, toHour, toMinute, repeat, repeatDays: repeat === 'custom' ? repeatDays : undefined },
      parseDateStr(selectedDateStr)
    );
    close();
  }

  function handleDelete() { onDelete(); close(); }

  const inputCls = 'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900';
  const selectCls = 'rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm text-neutral-800 outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && close()}
    >
      <div ref={modalRef} className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={close} className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="What are you doing?"
              className={inputCls}
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Date</label>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDateStr(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Time range */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Time</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <select value={fromHour} onChange={(e) => setFromHour(Number(e.target.value))} className={selectCls}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{hourLabel(i)}</option>
                  ))}
                </select>
                <select value={fromMinute} onChange={(e) => setFromMinute(Number(e.target.value))} className={selectCls}>
                  {MINUTES.map(m => <option key={m} value={m}>{pad(m)}</option>)}
                </select>
              </div>
              <span className="text-sm text-neutral-400">→</span>
              <div className="flex items-center gap-1">
                <select value={toHour} onChange={(e) => setToHour(Number(e.target.value))} className={selectCls}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{hourLabel(i)}</option>
                  ))}
                </select>
                <select value={toMinute} onChange={(e) => setToMinute(Number(e.target.value))} className={selectCls}>
                  {MINUTES.map(m => <option key={m} value={m}>{pad(m)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
              rows={2}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
            />
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={`h-7 w-7 rounded-full ${c.value} transition hover:scale-110 focus:outline-none ${color === c.value ? 'ring-2 ring-offset-2 ring-indigo-400' : ''}`}
                />
              ))}
            </div>
          </div>

          {/* Repeat */}
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Repeat</label>
            <div className="flex flex-wrap gap-1.5">
              {REPEAT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRepeat(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    repeat === opt.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {repeat === 'custom' && (
              <div className="mt-3 flex gap-1.5">
                {WEEK_DAYS.map(([label, idx]) => {
                  const active = repeatDays.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        setRepeatDays(prev =>
                          active ? prev.filter(d => d !== idx) : [...prev, idx]
                        )
                      }
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            {task && (
              <button onClick={handleDelete} className="rounded-xl px-3 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-950">
                Delete
              </button>
            )}
            {task && task.repeat !== 'none' && onDeleteAll && (
              <button
                onClick={() => { onDeleteAll(); close(); }}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950"
              >
                Delete all future
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={close} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
