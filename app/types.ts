export type RepeatOption = 'none' | 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'custom';

export type Task = {
  id: string;
  title: string;
  description: string;
  color: string;
  fromHour: number;
  fromMinute: number;
  toHour: number;
  toMinute: number;
  completed: boolean;
  repeat: RepeatOption;
  repeatDays?: number[]; // JS weekday indices (0=Sun … 6=Sat), used when repeat === 'custom'
};

export type DaySchedule = Task[];
export type ScheduleStore = Record<string, DaySchedule>;

export type HistoryGroup = {
  dateKey: string;
  label: string;
  tasks: Task[];
};
