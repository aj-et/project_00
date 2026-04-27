import { ScheduleStore } from '../types';

export function loadStore(): ScheduleStore {
  try { return JSON.parse(localStorage.getItem('scheduler-v2') ?? '{}'); }
  catch { return {}; }
}

export function saveStore(store: ScheduleStore): void {
  try { localStorage.setItem('scheduler-v2', JSON.stringify(store)); }
  catch { }
}

export function loadPinned(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('scheduler-pinned-v1') ?? '[]')); }
  catch { return new Set(); }
}

export function savePinned(pinned: Set<string>): void {
  try { localStorage.setItem('scheduler-pinned-v1', JSON.stringify([...pinned])); }
  catch { }
}
