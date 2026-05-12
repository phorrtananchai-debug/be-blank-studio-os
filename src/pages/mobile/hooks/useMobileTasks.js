import { useEffect, useState } from 'react';
import {
  addCollectionItem,
  deleteCollectionItem,
  isFirebaseConfigured,
  subscribeToCollection,
  updateCollectionItem,
} from '../../../services/firebase.js';
import { isTaskDone } from '../mobileTaskUtils.js';

const taskCollection = 'tasks';

function isDemoItem(item) {
  return String(item?.id || '').startsWith('demo-');
}

export function useMobileTasks({ onSelectTask, onToast }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return undefined;
    }

    return subscribeToCollection(taskCollection, setTasks, () => setTasks([]));
  }, []);

  const createTask = async (task, addToCalendar = false) => {
    const taskPayload = { ...task };
    delete taskPayload.type;

    await addCollectionItem(taskCollection, {
      ...taskPayload,
      calendarLinked: false,
      pendingCalendarSync: addToCalendar,
    });

    if (addToCalendar) {
      onToast('Saved. Calendar sync pending.');
    }
  };

  const markTaskDone = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.');
      onSelectTask(null);
      return;
    }

    await updateCollectionItem(taskCollection, task.id, { status: 'done', completedAt: new Date().toISOString() });
    onSelectTask(null);
  };

  const deleteTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.');
      onSelectTask(null);
      return;
    }

    await deleteCollectionItem(taskCollection, task.id);
    onSelectTask(null);
  };

  const duplicateTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.');
      return;
    }

    const copy = { ...task };
    delete copy.id;
    delete copy.completedAt;
    await addCollectionItem(taskCollection, {
      ...copy,
      status: 'todo',
      title: `${task.title || 'Untitled task'} copy`,
    });
  };

  const moveTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.');
      return;
    }

    const nextDate = window.prompt('Move to date (YYYY-MM-DD)', task.startDate || task.dueDate || '');
    if (!nextDate) {
      return;
    }
    await updateCollectionItem(taskCollection, task.id, { dueDate: nextDate, startDate: nextDate });
  };

  const clearCompletedTasks = async () => {
    const completedTasks = tasks.filter(isTaskDone);
    await Promise.all(completedTasks.map((task) => deleteCollectionItem(taskCollection, task.id)));
  };

  const editTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.');
      return;
    }

    const nextTitle = window.prompt('Task title', task.title || '');
    if (nextTitle === null) {
      return;
    }
    const nextDetail = window.prompt('Task detail', task.notes || task.detail || '');
    await updateCollectionItem(taskCollection, task.id, { title: nextTitle, detail: nextDetail || '', notes: nextDetail || '' });
  };

  return {
    clearCompletedTasks,
    createTask,
    deleteTask,
    duplicateTask,
    editTask,
    markTaskDone,
    moveTask,
    tasks,
  };
}
