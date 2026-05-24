import type { Quadrant } from "@/types/task";

export const QUADRANTS: Quadrant[] = [
  "important-urgent",
  "important-not-urgent",
  "not-important-urgent",
  "not-important-not-urgent",
];

export const QUADRANT_META: Record<
  Quadrant,
  { label: string; shortLabel: string; description: string }
> = {
  "important-urgent": {
    label: "Important & Urgent",
    shortLabel: "Do first",
    description: "Critical tasks that need immediate attention",
  },
  "important-not-urgent": {
    label: "Important, Not Urgent",
    shortLabel: "Schedule",
    description: "Meaningful work to plan ahead",
  },
  "not-important-urgent": {
    label: "Not Important, Urgent",
    shortLabel: "Delegate",
    description: "Time-sensitive but lower impact",
  },
  "not-important-not-urgent": {
    label: "Not Important, Not Urgent",
    shortLabel: "Later",
    description: "Low priority items",
  },
};
