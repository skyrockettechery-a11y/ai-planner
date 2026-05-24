import type { Quadrant } from "@/types/task";

const URGENT_KEYWORDS = [
  "urgent",
  "asap",
  "deadline",
  "immediately",
] as const;

const IMPORTANT_KEYWORDS = [
  "health",
  "study",
  "career",
  "family",
  "finance",
] as const;

export function classifyTask(title: string, notes = ""): Quadrant {
  const text = `${title} ${notes}`.toLowerCase();

  const isUrgent = URGENT_KEYWORDS.some((keyword) => text.includes(keyword));
  const isImportant = IMPORTANT_KEYWORDS.some((keyword) =>
    text.includes(keyword),
  );

  if (isImportant && isUrgent) return "important-urgent";
  if (isImportant && !isUrgent) return "important-not-urgent";
  if (!isImportant && isUrgent) return "not-important-urgent";
  return "not-important-not-urgent";
}
