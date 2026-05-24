import type { SupabaseClient } from "@supabase/supabase-js";
import type { Quadrant, Task } from "@/types/task";

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  due_date: string | null;
  quadrant: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

const QUADRANTS: Quadrant[] = [
  "important-urgent",
  "important-not-urgent",
  "not-important-urgent",
  "not-important-not-urgent",
];

function isQuadrant(value: string): value is Quadrant {
  return QUADRANTS.includes(value as Quadrant);
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? "",
    dueDate: row.due_date,
    quadrant: isQuadrant(row.quadrant) ? row.quadrant : "not-important-not-urgent",
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskToRow(task: Task, userId: string): TaskRow {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    notes: task.notes,
    due_date: task.dueDate,
    quadrant: task.quadrant,
    completed: task.completed,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export async function fetchCloudTasks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as TaskRow[]).map(rowToTask);
}

export async function syncCloudTasks(
  supabase: SupabaseClient,
  userId: string,
  tasks: Task[],
): Promise<void> {
  if (tasks.length > 0) {
    const rows = tasks.map((task) => taskToRow(task, userId));
    const { error: upsertError } = await supabase.from("tasks").upsert(rows, {
      onConflict: "id",
    });
    if (upsertError) throw upsertError;
  }

  const { data: existing, error: selectError } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId);

  if (selectError) throw selectError;

  const keepIds = new Set(tasks.map((task) => task.id));
  const toDelete = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.has(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", userId)
      .in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  if (tasks.length === 0 && (existing?.length ?? 0) > 0) {
    const { error: deleteAllError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", userId);
    if (deleteAllError) throw deleteAllError;
  }
}
