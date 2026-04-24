'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import TaskCard from './TaskCard';
import Sidebar from './Sidebar';
import TaskModal from './TaskModal';
import { Task, ScheduleStore, HistoryGroup, RepeatOption } from '../types';
import { loadStore, saveStore, loadPinned, savePinned } from '../lib/storage';
import { runHistoryCleanup, getHistoryGroups } from '../lib/history';

// ── helpers ──────────────────────────────────────────────────────────────────

// Use local calendar date — avoids UTC midnight mismatch in UTC+ timezones
function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function isToday(date: Date) { return dateKey(date) === dateKey(new Date()); }
function nowMinutes() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
function taskStart(t: Task) { return t.fromHour * 60 + t.fromMinute; }
function taskEnd(t: Task) { return t.toHour * 60 + t.toMinute; }

function formatTime(h: number, m: number) {
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function groupLabel(dk: string, today: Date): string {
  const [y, m, d] = dk.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - todayMidnight.getTime()) / 86400000);
  if (diff === 0) return 'Completed Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isMissed(task: Task, viewDate: Date, currentTime: number) {
  if (task.completed) return false;
  const todayKey = dateKey(new Date());
  const viewKey = dateKey(viewDate);
  if (viewKey < todayKey) return true;
  if (viewKey === todayKey) return taskEnd(task) < currentTime;
  return false;
}

function datesForRepeat(from: Date, repeat: RepeatOption, repeatDays?: number[]): Date[] {
  const dates: Date[] = [];
  for (let i = 1; i <= 60; i++) {
    const d = addDays(from, i);
    const dow = d.getDay();
    if (repeat === 'daily') dates.push(d);
    else if (repeat === 'weekly' && i % 7 === 0) dates.push(d);
    else if (repeat === 'weekdays' && dow >= 1 && dow <= 5) dates.push(d);
    else if (repeat === 'weekends' && (dow === 0 || dow === 6)) dates.push(d);
    else if (repeat === 'custom' && repeatDays?.includes(dow)) dates.push(d);
  }
  return dates;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Scheduler() {
  const [date, setDate] = useState(() => new Date());
  const [pinned, setPinned] = useState<Set<string>>(() => loadPinned());
  const [store, setStore] = useState<ScheduleStore>(() => {
    const p = loadPinned();
    const cleaned = runHistoryCleanup(loadStore(), p);
    saveStore(cleaned);
    return cleaned;
  });
  const [modal, setModal] = useState<{ task: Task | null } | null>(null);
  const [currentTime, setCurrentTime] = useState(() => nowMinutes());
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  const listRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  const prevTaskCount = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── animations ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (listRef.current) {
      gsap.fromTo(listRef.current,
        { opacity: 0, x: direction === 'right' ? 40 : -40 },
        { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' }
      );
    }
    if (statsRef.current) {
      gsap.fromTo(Array.from(statsRef.current.children),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out' }
      );
    }
  }, [date, direction]);

  useEffect(() => {
    const tasks = (store[dateKey(date)] ?? []).filter(t => !t.completed);
    if (tasks.length > prevTaskCount.current && taskListRef.current) {
      const cards = taskListRef.current.children;
      const newCard = cards[tasks.length - 1] as HTMLElement | undefined;
      if (newCard) {
        gsap.fromTo(newCard,
          { opacity: 0, y: -12, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.3)' }
        );
      }
    }
    prevTaskCount.current = tasks.length;
  }, [store, date]);

  // ── derived ───────────────────────────────────────────────────────────────

  const key = dateKey(date);
  const allDayTasks = store[key] ?? [];

  // Main list: only incomplete tasks, sorted by start time
  const tasks = allDayTasks
    .filter(t => !t.completed)
    .slice()
    .sort((a, b) => taskStart(a) - taskStart(b));

  // Stats computed from all tasks (including completed)
  const completedCount = allDayTasks.filter(t => t.completed).length;
  const missedCount = allDayTasks.filter(t => isMissed(t, date, currentTime)).length;
  const remainingCount = allDayTasks.filter(t => !t.completed && !isMissed(t, date, currentTime)).length;

  const upNext = isToday(date)
    ? tasks.filter(t => taskStart(t) >= currentTime).sort((a, b) => taskStart(a) - taskStart(b))[0] ?? null
    : null;

  // History anchored to the real current day
  const realToday = new Date();
  const todayKey = dateKey(realToday);

  // Today's completed tasks
  const todayCompleted = (store[todayKey] ?? []).filter(t => t.completed);

  // Past days: all tasks (for reuse + history), excludes today
  const pastGroups = getHistoryGroups(store, realToday).filter(g => g.dateKey !== todayKey);

  // Future days that have at least one completed task (completed ahead of schedule)
  const futureCompleted: HistoryGroup[] = Object.entries(store)
    .filter(([dk, tasks]) => dk > todayKey && tasks.some(t => t.completed))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dk, tasks]) => ({
      dateKey: dk,
      label: groupLabel(dk, realToday),
      tasks: tasks.filter(t => t.completed),
    }));

  const historyGroups: HistoryGroup[] = [
    ...(todayCompleted.length > 0 ? [{ dateKey: todayKey, label: 'Completed Today', tasks: todayCompleted }] : []),
    ...futureCompleted,
    ...pastGroups,
  ];

  // ── navigation ────────────────────────────────────────────────────────────

  function navigate(delta: number) {
    setDirection(delta > 0 ? 'right' : 'left');
    setDate(d => addDays(d, delta));
  }

  function goToday() {
    setDirection(date < new Date() ? 'right' : 'left');
    setDate(new Date());
  }

  // ── mutations ─────────────────────────────────────────────────────────────

  const mutate = useCallback((updater: (prev: ScheduleStore) => ScheduleStore) => {
    setStore(prev => { const next = updater(prev); saveStore(next); return next; });
  }, []);

  const handleSave = useCallback((taskData: Omit<Task, 'id' | 'completed'>, targetDate: Date) => {
    const targetKey = dateKey(targetDate);
    mutate(prev => {
      const isEdit = modal?.task != null;
      const newTask: Task = { ...taskData, id: isEdit ? modal!.task!.id : crypto.randomUUID(), completed: false };
      const updated: ScheduleStore = { ...prev };

      if (isEdit) {
        if (targetKey !== key) {
          // Moving task to a different day
          updated[key] = (updated[key] ?? []).filter(t => t.id !== newTask.id);
          updated[targetKey] = [...(updated[targetKey] ?? []), newTask];
        } else {
          updated[key] = (updated[key] ?? []).map(t => t.id === newTask.id ? newTask : t);
        }
      } else {
        updated[targetKey] = [...(updated[targetKey] ?? []), newTask];
        if (taskData.repeat !== 'none') {
          for (const d of datesForRepeat(targetDate, taskData.repeat, taskData.repeatDays)) {
            const dk = dateKey(d);
            updated[dk] = [...(updated[dk] ?? []), { ...newTask, id: crypto.randomUUID() }];
          }
        }
      }
      return updated;
    });
  }, [key, modal, mutate]);

  const handleDelete = useCallback(() => {
    if (!modal?.task) return;
    const id = modal.task.id;
    mutate(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(t => t.id !== id) }));
  }, [key, modal, mutate]);

  // Deletes this instance + all future days that have a task with matching
  // title + time + repeat (covers tasks generated by the repeat propagation)
  const handleDeleteAll = useCallback(() => {
    if (!modal?.task) return;
    const task = modal.task;
    mutate(prev => {
      const updated: ScheduleStore = {};
      for (const [dk, dayTasks] of Object.entries(prev)) {
        if (dk < key) {
          // Past days — keep untouched
          updated[dk] = dayTasks;
        } else if (dk === key) {
          // Current day — remove this specific task
          updated[dk] = dayTasks.filter(t => t.id !== task.id);
        } else {
          // Future days — remove any task matching by title + times + repeat
          const filtered = dayTasks.filter(t =>
            !(t.title === task.title &&
              t.fromHour === task.fromHour &&
              t.fromMinute === task.fromMinute &&
              t.toHour === task.toHour &&
              t.toMinute === task.toMinute &&
              t.repeat === task.repeat)
          );
          if (filtered.length > 0) updated[dk] = filtered;
        }
      }
      return updated;
    });
  }, [key, modal, mutate]);

  const handleComplete = useCallback((taskId: string) => {
    mutate(prev => ({
      ...prev,
      [key]: (prev[key] ?? []).map(t => t.id === taskId ? { ...t, completed: true } : t),
    }));
  }, [key, mutate]);

  const handleDirectDelete = useCallback((taskId: string) => {
    mutate(prev => ({ ...prev, [key]: (prev[key] ?? []).filter(t => t.id !== taskId) }));
  }, [key, mutate]);

  const handleReuse = useCallback((task: Task) => {
    mutate(prev => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { ...task, id: crypto.randomUUID(), completed: false }],
    }));
  }, [key, mutate]);

  const handleHistoryDelete = useCallback((taskId: string, dk: string) => {
    mutate(prev => ({
      ...prev,
      [dk]: (prev[dk] ?? []).filter(t => t.id !== taskId),
    }));
    setPinned(prev => {
      if (!prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.delete(taskId);
      savePinned(next);
      return next;
    });
  }, [mutate]);

  const handleTogglePin = useCallback((taskId: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      savePinned(next);
      return next;
    });
  }, []);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        historyGroups={historyGroups}
        pinned={pinned}
        onReuse={handleReuse}
        onTogglePin={handleTogglePin}
        onDeleteFromHistory={handleHistoryDelete}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white/90 px-5 py-4 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(o => !o)}
                  className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
                  </svg>
                </button>
                <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{formatDate(date)}</h1>
              </div>
              <div className="flex items-center gap-2">
                {!isToday(date) && (
                  <button onClick={goToday} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800">
                    Today
                  </button>
                )}
                <button onClick={() => navigate(-1)} className="rounded-xl border border-neutral-200 p-2 text-neutral-500 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
                  </svg>
                </button>
                <button onClick={() => navigate(1)} className="rounded-xl border border-neutral-200 p-2 text-neutral-500 transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>
            </div>

            {allDayTasks.length > 0 && (
              <div ref={statsRef} className="mt-3 flex gap-2">
                <StatPill value={completedCount} label="Completed" color="emerald" />
                <StatPill value={missedCount} label="Missed" color="rose" />
                <StatPill value={remainingCount} label="Remaining" color="indigo" />
              </div>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div ref={listRef} className="mx-auto max-w-2xl px-4 py-6 space-y-4">

            {/* Up Next */}
            {upNext && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">Up Next</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-indigo-900 dark:text-indigo-100">{upNext.title}</p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400">
                      {formatTime(upNext.fromHour, upNext.fromMinute)} → {formatTime(upNext.toHour, upNext.toMinute)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleComplete(upNext.id)}
                    className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Task list */}
            <div ref={taskListRef}>
              {tasks.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-neutral-400">
                    {completedCount > 0 ? 'All tasks completed!' : 'No tasks scheduled for this day'}
                  </p>
                  <p className="mt-1 text-xs text-neutral-300 dark:text-neutral-600">
                    {completedCount > 0 ? 'Check the history panel to review them.' : 'Click below to add one'}
                  </p>
                </div>
              )}
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  viewDate={date}
                  currentTime={currentTime}
                  onClick={() => setModal({ task })}
                  onComplete={() => handleComplete(task.id)}
                  onDelete={() => handleDirectDelete(task.id)}
                />
              ))}
            </div>

            {/* Add button */}
            <button
              onClick={() => setModal({ task: null })}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 py-3 text-sm font-medium text-neutral-400 transition hover:border-indigo-300 hover:text-indigo-500 dark:border-neutral-700 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
              </svg>
              New Task
            </button>
          </div>
        </div>
      </main>

      {modal !== null && (
        <TaskModal
          task={modal.task}
          defaultDate={date}
          onSave={handleSave}
          onDelete={handleDelete}
          onDeleteAll={modal.task?.repeat !== 'none' ? handleDeleteAll : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── StatPill ──────────────────────────────────────────────────────────────────

function StatPill({ value, label, color }: { value: number; label: string; color: 'emerald' | 'rose' | 'indigo' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900',
  }[color];
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      <span className="text-sm font-bold">{value}</span>{label}
    </div>
  );
}
