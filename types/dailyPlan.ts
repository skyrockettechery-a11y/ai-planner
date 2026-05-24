import type { Task } from "@/types/task";

export interface TaskRecommendation {
  task: Task;
  reason: string;
}

export interface DailyPlan {
  recommendations: TaskRecommendation[];
  summary: string;
  warning?: string;
}
