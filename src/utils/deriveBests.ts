import LiftingResults from "../types/liftingResults";
import { maxPositive, numberValue } from "./format";

export function deriveSnatchBest(result: LiftingResults): number {
  return numberValue(result.snatchBest) || maxPositive([result.snatch1, result.snatch2, result.snatch3]);
}

export function deriveCjBest(result: LiftingResults): number {
  return numberValue(result.cjBest) || maxPositive([result.cj1, result.cj2, result.cj3]);
}

export function deriveTotal(result: LiftingResults): number {
  if (typeof result.total === "number") {
    return result.total;
  }

  const snatchBest = deriveSnatchBest(result);
  const cjBest = deriveCjBest(result);
  return snatchBest > 0 && cjBest > 0 ? snatchBest + cjBest : 0;
}
