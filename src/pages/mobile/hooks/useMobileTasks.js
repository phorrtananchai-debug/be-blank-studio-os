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

    try {
      await addCollectionItem(taskCollection, {
        ...taskPayload,
        calendarLinked: false,
        pendingCalendarSync: addToCalendar,
      });

      onToast(addToCalendar ? 'Saved. Calendar sync pending.' : 'Task created.');
      return true;
    } catch (error) {
      console.error(error);
      onToast('Task creation failed. Check your connection and try again.', 'error');
      return false;
    }
  };

  const markTaskDone = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.', 'info');
      onSelectTask(null);
      return;
    }

    try {
      await updateCollectionItem(taskCollection, task.id, { status: 'done', completedAt: new Date().toISOString() });
      onToast('Task marked done.');
      onSelectTask(null);
    } catch (error) {
      console.error(error);
      onToast('Task update failed. Check your connection and try again.', 'error');
    }
  };

  const deleteTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.', 'info');
      onSelectTask(null);
      return;
    }

    try {
      await deleteCollectionItem(taskCollection, task.id);
      onToast('Task deleted.');
      onSelectTask(null);
    } catch (error) {
      console.error(error);
      onToast('Task delete failed. Check your connection and try again.', 'error');
    }
  };

  const duplicateTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.', 'info');
      return;
    }

    const copy = { ...task };
    delete copy.id;
    delete copy.completedAt;
    try {
      await addCollectionItem(taskCollection, {
        ...copy,
        status: 'todo',
        title: `${task.title || 'Untitled task'} copy`,
      });
      onToast('Task duplicated.');
    } catch (error) {
      console.error(error);
      onToast('Task duplicate failed. Check your connection and try again.', 'error');
    }
  };

  const moveTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.', 'info');
      return;
    }

    const nextDate = window.prompt('Move to date (YYYY-MM-DD)', task.startDate || task.dueDate || '');
    if (!nextDate) {
      return;
    }
    try {
      await updateCollectionItem(taskCollection, task.id, { dueDate: nextDate, startDate: nextDate });
      onToast('Task moved.');
    } catch (error) {
      console.error(error);
      onToast('Task move failed. Check your connection and try again.', 'error');
    }
  };

  const clearCompletedTasks = async () => {
    const completedTasks = tasks.filter(isTaskDone);
    try {
      await Promise.all(completedTasks.map((task) => deleteCollectionItem(taskCollection, task.id)));
    } catch (error) {
      console.error(error);
      onToast('Could not clear completed tasks. Check your connection and try again.', 'error');
      throw error;
    }
  };

  const editTask = async (task) => {
    if (isDemoItem(task)) {
      onToast('Demo data is read-only.', 'info');
      return;
    }

    const nextTitle = window.prompt('Task title', task.title || '');
    if (nextTitle === null) {
      return;
    }
    const nextDetail = window.prompt('Task detail', task.notes || task.detail || '');
    try {
      await updateCollectionItem(taskCollection, task.id, { title: nextTitle, detail: nextDetail || '', notes: nextDetail || '' });
      onToast('Task updated.');
    } catch (error) {
      console.error(error);
      onToast('Task update failed. Check your connection and try again.', 'error');
    }
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
