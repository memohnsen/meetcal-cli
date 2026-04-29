export default interface LiftingResults {
  id?: number;
  convexId?: string;
  event_id?: string;
  eventId: string;
  federation?: string;
  legacyId?: number;
  meet: string;
  date: string;
  name: string;
  age: string;
  bodyWeight: number;
  weightClass?: string
  snatch1: number;
  snatch2: number;
  snatch3: number;
  snatchBest: number;
  cj1: number;
  cj2: number;
  cj3: number;
  cjBest: number;
  total: number;
  adaptive: boolean
}

export type AttemptKey = "snatch1" | "snatch2" | "snatch3" | "cj1" | "cj2" | "cj3";
export const snatchAttempts: AttemptKey[] = ["snatch1", "snatch2", "snatch3"];
export const cjAttempts: AttemptKey[] = ["cj1", "cj2", "cj3"];

export type AdaptiveRecord = {
  weightClass: string
  snatch: number
  cj: number
  total: number
}
