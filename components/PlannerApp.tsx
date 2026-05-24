"use client";

import { useEffect } from "react";
import { ActiveTasksSection } from "@/components/ActiveTasksSection";
import { CompletedSection } from "@/components/CompletedSection";
import { DailyOverview } from "@/components/DailyOverview";
import { DoingNowSection } from "@/components/DoingNowSection";
import { TaskForm } from "@/components/TaskForm";
import { TodaysPlan } from "@/components/TodaysPlan";
import { useDoingNow } from "@/hooks/useDoingNow";
import { useTasks } from "@/hooks/useTasks";
import { getActiveTasks, getCompletedTasks } from "@/lib/tasks";

export function PlannerApp() {
  const {
    tasks,
    hydrated,
    addTask,
    editTask,
    deleteTask,
    completeTask,
    restoreTask,
    setQuadrant,
  } = useTasks();

  const { doingNowId, setDoingNow, clearDoingNow } = useDoingNow();

  const activeTasks = getActiveTasks(tasks);
  const completedTasks = getCompletedTasks(tasks);
  const doingNowTask =
    activeTasks.find((task) => task.id === doingNowId) ?? null;

  useEffect(() => {
    if (doingNowId && !doingNowTask) {
      clearDoingNow();
    }
  }, [doingNowId, doingNowTask, clearDoingNow]);

  const handleComplete = (id: string) => {
    completeTask(id);
    if (doingNowId === id) {
      clearDoingNow();
    }
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    if (doingNowId === id) {
      clearDoingNow();
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading your tasks…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          AI Planner
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Capture tasks, auto-classify by priority, and track your day.
        </p>
      </header>

      <DailyOverview
        total={tasks.length}
        completed={completedTasks.length}
        active={activeTasks.length}
      />

      <DoingNowSection
        task={doingNowTask}
        onClear={clearDoingNow}
        onComplete={handleComplete}
      />

      <TodaysPlan activeTasks={activeTasks} />

      <TaskForm onAdd={addTask} />

      <ActiveTasksSection
        tasks={activeTasks}
        doingNowId={doingNowId}
        onStart={setDoingNow}
        onComplete={handleComplete}
        onEdit={editTask}
        onDelete={handleDelete}
        onQuadrantChange={setQuadrant}
      />

      <CompletedSection
        tasks={completedTasks}
        onRestore={restoreTask}
        onEdit={editTask}
        onDelete={handleDelete}
        onQuadrantChange={setQuadrant}
      />
    </div>
  );
}
