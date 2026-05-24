export type Quadrant =
  | "important-urgent"
  | "important-not-urgent"
  | "not-important-urgent"
  | "not-important-not-urgent";

export interface Task {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null;
  quadrant: Quadrant;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  notes?: string;
  dueDate?: string | null;
  quadrant?: Quadrant;
}
