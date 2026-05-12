import { useState } from 'react';
import {
  describeTaskDate,
  formatPreviewDate,
  getPhaseLabel,
  getProjectLabel,
  getTaskDate,
  parseQuickTask,
} from '../../pages/mobile/mobileTaskUtils.js';

export function MobileTaskSheet({ onClose, onDelete, onDone, onDuplicate, onEdit, onMove, projects = [], task }) {
  const dueDate = getTaskDate(task);

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[#F5F5FA] px-5 py-6">
      <button className="text-[11px] font-medium uppercase tracking-tight text-[#777777] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={onClose}>
        Close
      </button>
      <div className="mt-16">
        <p className="text-[11px] font-medium uppercase tracking-tight text-[#777777]">{getProjectLabel(task, projects)} - {getPhaseLabel(task, projects)}</p>
        <h2 className="mt-4 text-3xl font-medium leading-tight">{task.title}</h2>
        <p className="mt-5 text-base leading-7 text-[#777777]">{task.notes || task.detail || 'No detail added.'}</p>
        {dueDate && <p className="mt-8 text-sm text-[#212121]">{describeTaskDate(task)}</p>}
        <div className="mt-10 grid grid-cols-2 gap-3">
          <button
            className="h-14 rounded-[18px] bg-[#212121] text-sm font-medium text-[#F5F5FA] transition duration-[120ms] ease-out active:scale-95"
            type="button"
            onClick={() => onDone(task)}
          >
            Mark done
          </button>
          <button
            className="h-14 rounded-[18px] border border-[rgba(33,33,33,0.08)] bg-white text-sm font-medium text-[#212121] transition duration-[120ms] ease-out active:scale-95"
            type="button"
            onClick={() => onEdit?.(task)}
          >
            Edit
          </button>
          <button
            className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] bg-white text-sm font-medium text-[#212121] transition duration-[120ms] ease-out active:scale-95"
            type="button"
            onClick={() => onMove?.(task)}
          >
            Move
          </button>
          <button
            className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] bg-white text-sm font-medium text-[#212121] transition duration-[120ms] ease-out active:scale-95"
            type="button"
            onClick={() => onDuplicate?.(task)}
          >
            Duplicate
          </button>
        </div>
        <button
          className="mt-3 h-12 w-full rounded-[18px] text-sm font-medium text-[#777777] transition duration-[120ms] ease-out active:scale-95 active:bg-white"
          type="button"
          onClick={() => onDelete?.(task)}
        >
          Delete task
        </button>
      </div>
    </div>
  );
}

export function MobileQuickAdd({ onClose, onCreate, projects }) {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const parsedTask = value.trim() ? parseQuickTask(value, projects) : null;

  const handleCreate = async (addToCalendar = false) => {
    if (!value.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const wasCreated = await onCreate(parseQuickTask(value, projects), addToCalendar);
      if (wasCreated) {
        setValue('');
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(33,33,33,0.25)]">
      <div className="w-full rounded-t-[32px] bg-white p-5">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[rgba(33,33,33,0.08)]" />
        <label className="block">
          <span className="text-[11px] font-medium uppercase tracking-tight text-[#777777]">Quick add task</span>
          <textarea
            autoFocus
            className="mt-3 min-h-36 w-full resize-none rounded-[24px] bg-[#F5F5FA] px-4 py-4 text-xl font-medium leading-8 text-[#212121] outline-none ring-0 transition duration-[120ms] ease-out placeholder:text-[#777777] disabled:opacity-60 focus:bg-white focus:ring-1 focus:ring-[#212121]"
            disabled={isSaving}
            placeholder="Site visit Karun tomorrow 2pm"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <span className="mt-2 block text-xs text-[#777777]">Write naturally. Project and date are detected before saving.</span>
        </label>
        {parsedTask && (
          <div className="mt-4 rounded-[22px] bg-[#DBDFE9]/60 p-4 text-sm leading-6 text-[#777777]">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-tight text-[#212121]">Detected</p>
            <p>Project: <span className="text-[#212121]">{parsedTask.projectName}</span></p>
            <p>Date: <span className="text-[#212121]">{formatPreviewDate(parsedTask.startDate || parsedTask.dueDate)}</span></p>
            <p>Range: <span className="text-[#212121]">{describeTaskDate(parsedTask)}</span></p>
            <p>Type: <span className="text-[#212121]">{parsedTask.type}</span></p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] text-sm font-medium transition duration-[120ms] ease-out disabled:opacity-50 active:scale-95" disabled={isSaving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="h-12 rounded-[18px] bg-[#212121] text-sm font-medium text-[#F5F5FA] transition duration-[120ms] ease-out disabled:opacity-50 active:scale-95" disabled={!value.trim() || isSaving} type="button" onClick={() => handleCreate(false)}>
            {isSaving ? 'Saving...' : 'Save Task'}
          </button>
        </div>
        <button
          className="mt-3 h-12 w-full rounded-[18px] bg-[#FFF0A3] text-sm font-semibold text-[#212121] transition duration-[120ms] ease-out disabled:opacity-50 active:scale-95"
          disabled={!value.trim() || isSaving}
          type="button"
          onClick={() => handleCreate(true)}
        >
          {isSaving ? 'Saving...' : 'Save + Add to Calendar'}
        </button>
      </div>
    </div>
  );
}
