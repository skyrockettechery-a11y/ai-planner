"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createTask, updateTask } from "@/lib/tasks";
import {
  getServerTasksSnapshot,
  getTasksSnapshot,
  subscribeTasks,
  updateTasks,
} from "@/lib/taskStore";
import type { Quadrant, TaskInput } from "@/types/task";

const noopSubscribe = () => () => {};

function getClientHydratedSnapshot(): boolean {
  return true;
}

function getServerHydratedSnapshot(): boolean {
  return false;
}

export function useTasks() {
  const tasks = useSyncExternalStore(
    subscribeTasks,
    getTasksSnapshot,
    getServerTasksSnapshot,
  );

  const hydrated = useSyncExternalStore(
    noopSubscribe,
    getClientHydratedSnapshot,
    getServerHydratedSnapshot,
  );

  const addTask = useCallback((input: TaskInput) => {
    const task = createTask(input);
    updateTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const editTask = useCallback((id: string, updates: Partial<TaskInput>) => {
    updateTasks((prev) =>
      prev.map((task) =>
        task.id === id ? updateTask(task, updates) : task,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    updateTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    updateTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    );
  }, []);

  const completeTask = useCallback((id: string) => {
    updateTasks((prev) =>
      prev.map((task) =>
        task.id === id && !task.completed
          ? {
              ...task,
              completed: true,
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    );
  }, []);

  const restoreTask = useCallback((id: string) => {
    updateTasks((prev) =>
      prev.map((task) =>
        task.id === id && task.completed
          ? {
              ...task,
              completed: false,
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    );
  }, []);

  const setQuadrant = useCallback((id: string, quadrant: Quadrant) => {
    updateTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, quadrant, updatedAt: new Date().toISOString() }
          : task,
      ),
    );
  }, []);

  return {
    tasks,
    hydrated,
    addTask,
    editTask,
    deleteTask,
    toggleComplete,
    completeTask,
    restoreTask,
    setQuadrant,
  };
}
