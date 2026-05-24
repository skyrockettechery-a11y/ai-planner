import type { Quadrant } from "@/types/task";

export function isImportantQuadrant(quadrant: Quadrant): boolean {
  return (
    quadrant === "important-urgent" || quadrant === "important-not-urgent"
  );
}

export function isUrgentQuadrant(quadrant: Quadrant): boolean {
  return (
    quadrant === "important-urgent" || quadrant === "not-important-urgent"
  );
}
