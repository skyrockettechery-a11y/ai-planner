"use client";

import { useEffect, useState } from "react";
import { ActiveTasksSection } from "@/components/ActiveTasksSection";
import { AuthBar } from "@/components/AuthBar";
import { AuthFeedback } from "@/components/AuthFeedback";
import { AuthSessionHandler } from "@/components/AuthSessionHandler";
import { CalendarAvailability } from "@/components/CalendarAvailability";
import { CompletedSection } from "@/components/CompletedSection";
import { DailyOverview } from "@/components/DailyOverview";
import { DoingNowSection } from "@/components/DoingNowSection";
import { ImportLocalBanner } from "@/components/ImportLocalBanner";
import { SmartDailySchedule } from "@/components/SmartDailySchedule";
import { TaskForm } from "@/components/TaskForm";
import { TodaysPlan } from "@/components/TodaysPlan";
import { useAuth } from "@/hooks/useAuth";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useDoingNow } from "@/hooks/useDoingNow";
import { useTasks } from "@/hooks/useTasks";
import {
  countImportableLocalTasks,
  importLocalTasks,
} from "@/lib/importLocal";
import { reloadLocalState } from "@/lib/reloadLocal";
import type { SupabaseConfigDiagnostic } from "@/lib/supabase/config";
import { getActiveTasks, getCompletedTasks } from "@/lib/tasks";

interface PlannerAppProps {
  devSupabaseDiagnostic?: SupabaseConfigDiagnostic | null;
}

export function PlannerApp({ devSupabaseDiagnostic = null }: PlannerAppProps) {
  const {
    user,
    loading: authLoading,
    configured,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  } = useAuth();

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
  const [importDismissedForUserId, setImportDismissedForUserId] = useState<
    string | null
  >(null);
  const [authCompleting, setAuthCompleting] = useState(false);
  // Bumped when the Google Calendar connection drops, which remounts the
  // Smart Daily Schedule so its transient draft is discarded (Mission 12).
  const [calendarEpoch, setCalendarEpoch] = useState(0);
  // Bumped when the schedule finds Google Calendar access revoked, which
  // remounts the Calendar card so it re-checks its connection status.
  const [calendarCardEpoch, setCalendarCardEpoch] = useState(0);

  const ready = hydrated && !authLoading && !authCompleting;
  useCloudSync(user?.id, ready && Boolean(user));

  const activeTasks = getActiveTasks(tasks);
  const completedTasks = getCompletedTasks(tasks);
  const doingNowTask =
    activeTasks.find((task) => task.id === doingNowId) ?? null;

  const importableCount = user
    ? countImportableLocalTasks(tasks)
    : 0;
  const showImportBanner =
    Boolean(user) &&
    importableCount > 0 &&
    importDismissedForUserId !== user?.id;

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

  const handleImportLocal = () => {
    importLocalTasks(tasks);
    if (user) setImportDismissedForUserId(user.id);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading your tasks…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            AI Planner
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Capture tasks, auto-classify by priority, and track your day.
          </p>
        </div>
        <AuthSessionHandler onCompletingChange={setAuthCompleting} />
        <AuthFeedback key={authCompleting ? "auth-working" : "auth-settled"} />
        <AuthBar
          configured={configured}
          loading={authLoading}
          email={user?.email ?? null}
          devDiagnostic={devSupabaseDiagnostic}
          onGoogleSignIn={signInWithGoogle}
          onEmailSignIn={signInWithEmail}
          onSignOut={async () => {
            await signOut();
            reloadLocalState();
          }}
        />
      </header>

      <TaskForm onAdd={addTask} />

      {showImportBanner && (
        <ImportLocalBanner
          importableCount={importableCount}
          onImport={handleImportLocal}
          onDismiss={() => user && setImportDismissedForUserId(user.id)}
        />
      )}

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

      {user && (
        <SmartDailySchedule
          key={`${user.id}:${calendarEpoch}`}
          activeTasks={activeTasks}
          onCalendarAccessLost={() =>
            setCalendarCardEpoch((epoch) => epoch + 1)
          }
        />
      )}

      {user && (
        <CalendarAvailability
          key={`${user.id}:${calendarCardEpoch}`}
          onDisconnected={() => setCalendarEpoch((epoch) => epoch + 1)}
        />
      )}

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
