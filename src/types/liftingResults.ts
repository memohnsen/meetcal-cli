export default interface LiftingResults {
  id: number;
  convexId?: string;
  event_id: string;
  meet: string;
  date: string;
  name: string;
  age: string;
  body_weight: number;
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
}

export type AdaptiveRecord = {
  weightClass: string
  snatch: number
  cj: number
  total: number
}
