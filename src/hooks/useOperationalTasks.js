import { useEffect, useState } from 'react';
import {
  addCollectionItem,
  isFirebaseConfigured,
  subscribeToCollection,
  updateCollectionItem,
} from '../services/firebase.js';
import { readCollection, writeCollection } from '../services/storage.js';
import { createOperationalTask, taskCollectionName } from '../utils/operationalTasks.js';

const localTaskKey = 'beBlank.tasks';

export function useOperationalTasks({ enabled = true, onToast } = {}) {
  const [tasks, setTasks] = useState(() => {
    if (typeof window === 'undefined' || isFirebaseConfigured()) return [];
    return readCollection(localTaskKey, []);
  });

  useEffect(() => {
    if (!enabled) return undefined;

    if (!isFirebaseConfigured()) {
      writeCollection(localTaskKey, tasks);
      return undefined;
    }

    return undefined;
  }, [enabled, tasks]);

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) {
      return undefined;
    }

    return subscribeToCollection(taskCollectionName, setTasks, () => {
      setTasks([]);
      onToast?.('Task sync failed. Check your connection and try again.', 'error');
    });
  }, [enabled, onToast]);

  const createTask = async (taskDraft) => {
    const task = createOperationalTask(taskDraft);

    if (!isFirebaseConfigured()) {
      setTasks((items) => [task, ...items]);
      onToast?.('Task captured.');
      return task;
    }

    try {
      const savedTask = await addCollectionItem(taskCollectionName, task);
      onToast?.('Task captured.');
      return savedTask;
    } catch (error) {
      console.error(error);
      onToast?.('Task capture failed. Check your connection and try again.', 'error');
      return null;
    }
  };

  const updateTask = async (id, updates) => {
    if (!id) return null;
    const nextUpdates = { ...updates };

    if (!isFirebaseConfigured()) {
      setTasks((items) => items.map((task) => (task.id === id ? { ...task, ...nextUpdates } : task)));
      return { id, ...nextUpdates };
    }

    try {
      return await updateCollectionItem(taskCollectionName, id, nextUpdates);
    } catch (error) {
      console.error(error);
      onToast?.('Task update failed. Check your connection and try again.', 'error');
      return null;
    }
  };

  const completeTask = async (task) => {
    const updatedTask = await updateTask(task?.id, {
      completedAt: new Date().toISOString(),
      status: 'DONE',
    });
    if (updatedTask) {
      onToast?.('Task marked done.');
    }
    return updatedTask;
  };

  const replaceLocalTasks = (nextTasks) => {
    if (isFirebaseConfigured()) {
      return false;
    }

    setTasks(Array.isArray(nextTasks) ? nextTasks.map((task) => createOperationalTask(task)) : []);
    return true;
  };

  return {
    completeTask,
    createTask,
    replaceLocalTasks,
    tasks,
    updateTask,
  };
}
