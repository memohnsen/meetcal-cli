export function movementRank(movement: string): number {
  if (movement === "Snatch") return 0;
  if (movement === "Clean & Jerk") return 1;
  if (movement === "Total") return 2;
  return 3;
}
