'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Task, HistoryGroup } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  historyGroups: HistoryGroup[];
  pinned: Set<string>;
  onReuse: (task: Task) => void;
  onTogglePin: (taskId: string) => void;
  onDeleteFromHistory: (taskId: string, dateKey: string) => void;
};

function formatTime(h: number, m: number) {
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function HistoryItem({
  task, isPinned, onReuse, onTogglePin, onDelete,
}: { task: Task; isPinned: boolean; onReuse: () => void; onTogglePin: () => void; onDelete: () => void }) {
  const itemRef = useRef<HTMLDivElement>(null);

  function handleReuse() {
    const el = itemRef.current;
    if (el) {
      gsap.fromTo(el,
        { backgroundColor: 'rgba(99,102,241,0.18)' },
        { backgroundColor: 'rgba(99,102,241,0)', duration: 0.6, ease: 'power2.out' }
      );
    }
    onReuse();
  }

  function handleDelete() {
    const el = itemRef.current;
    if (!el) { onDelete(); return; }
    gsap.to(el, {
      opacity: 0, x: 30, height: 0,
      paddingTop: 0, paddingBottom: 0, marginBottom: 0,
      duration: 0.25, ease: 'power2.in',
      onComplete: onDelete,
    });
  }

  return (
    <div
      ref={itemRef}
      className="group flex items-center gap-2 rounded-lg px-2 py-2 mb-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors overflow-hidden"
    >
      <div className={`h-2 w-2 shrink-0 rounded-full ${task.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{task.title}</p>
        <p className="text-[11px] text-neutral-400">
          {formatTime(task.fromHour, task.fromMinute)} → {formatTime(task.toHour, task.toMinute)}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onTogglePin}
          title={isPinned ? 'Unpin' : 'Pin to keep'}
          className={`flex h-6 w-6 items-center justify-center rounded transition ${
            isPinned ? 'text-amber-500' : 'text-neutral-300 hover:text-amber-400'
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146Z" />
          </svg>
        </button>
        <button
          onClick={handleReuse}
          title="Reuse this task today"
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-300 transition hover:text-indigo-500"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          title="Remove from history"
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-300 transition hover:text-rose-500"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.5a.5.5 0 0 0 0 1H3v9.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V4.5h.5a.5.5 0 0 0 0-1H11Zm-6.5 1h7v9.5a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5V3.5Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose, historyGroups, pinned, onReuse, onTogglePin, onDeleteFromHistory }: Props) {
  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // Entrance animation on first mount
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    gsap.fromTo(sidebarRef.current,
      { x: -280, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
    );
  }, []);

  // Mobile open/close
  useEffect(() => {
    const sidebar = sidebarRef.current;
    const overlay = overlayRef.current;
    if (!sidebar || !overlay) return;

    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    if (isOpen) {
      gsap.to(sidebar, { x: 0, duration: 0.35, ease: 'power2.out' });
      gsap.to(overlay, { opacity: 1, pointerEvents: 'auto', duration: 0.25 });
    } else {
      gsap.to(sidebar, { x: -280, duration: 0.3, ease: 'power2.in' });
      gsap.to(overlay, { opacity: 0, pointerEvents: 'none', duration: 0.2 });
    }
  }, [isOpen]);

  // Stagger history items
  useEffect(() => {
    if (!itemsRef.current) return;
    const items = itemsRef.current.querySelectorAll('[data-history-item]');
    if (items.length === 0) return;
    gsap.fromTo(items,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out', delay: 0.15 }
    );
  }, [historyGroups]);

  return (
    <>
      {/* Mobile overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none md:hidden"
      />

      <aside
        ref={sidebarRef}
        className="fixed top-0 left-0 z-40 h-full w-70 flex-col border-r border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950 flex md:relative md:z-auto"
      >
        {/* Profile */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-5 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
              <span className="text-sm font-bold text-white">AJ</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Aaron</p>
              <p className="text-xs text-neutral-400">Daily Scheduler</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z" />
            </svg>
          </button>
        </div>

        {/* History */}
        <div ref={itemsRef} className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
            History
          </p>

          {historyGroups.length === 0 ? (
            <p className="text-xs italic text-neutral-400">No recent history</p>
          ) : (
            historyGroups.map(group => (
              <div key={group.dateKey} data-history-item className="mb-4">
                <p className="mb-1.5 text-xs font-medium text-neutral-500">{group.label}</p>
                {group.tasks.map(task => (
                  <HistoryItem
                    key={task.id}
                    task={task}
                    isPinned={pinned.has(task.id)}
                    onReuse={() => onReuse(task)}
                    onTogglePin={() => onTogglePin(task.id)}
                    onDelete={() => onDeleteFromHistory(task.id, group.dateKey)}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <p className="text-[10px] text-neutral-300 dark:text-neutral-600">
            History auto-clears after 3 days · Pin to keep
          </p>
        </div>
      </aside>
    </>
  );
}
