import { ScheduleStore, HistoryGroup } from '../types';

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function relativeLabel(key: string, today: Date): string {
  const yesterday = dateKey(addDays(today, -1));
  if (key === yesterday) return 'Yesterday';
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function runHistoryCleanup(store: ScheduleStore, pinned: Set<string>): ScheduleStore {
  const today = dateKey(new Date());
  const cutoff = dateKey(addDays(new Date(), -3));
  const result: ScheduleStore = {};

  for (const [key, tasks] of Object.entries(store)) {
    if (key >= today || key >= cutoff) {
      result[key] = tasks;
    } else {
      const kept = tasks.filter(t => pinned.has(t.id));
      if (kept.length > 0) result[key] = kept;
    }
  }
  return result;
}

export function getHistoryGroups(store: ScheduleStore, today: Date): HistoryGroup[] {
  const todayKey = dateKey(today);
  return Object.keys(store)
    .filter(k => k < todayKey && store[k].length > 0)
    .sort()
    .reverse()
    .slice(0, 3)
    .map(k => ({ dateKey: k, label: relativeLabel(k, today), tasks: store[k] }));
}
