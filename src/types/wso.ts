export type AthleteRow = {
  name: string;
  wso?: string | null;
};

export type LiftRow = {
  meet: string;
  name: string;
  age?: string | null;
  snatch1?: number | null;
  snatch2?: number | null;
  snatch3?: number | null;
  snatchBest?: number | null;
  cj1?: number | null;
  cj2?: number | null;
  cj3?: number | null;
  cjBest?: number | null;
  total?: number | null;
};

export type ClubPrDetail = {
  name: string;
  movement: "Snatch" | "Clean & Jerk" | "Total";
  newPr: number;
  previousPr: number;
};

export type ClubMedalDetail = {
  name: string;
  age: string;
  movement: "Snatch" | "Clean & Jerk" | "Total";
  place: number;
  result: number;
};

export const RESULT_MEET_ALIASES: Record<string, string[]> = {
  "2026 Masters National Championships & National University Championships": [
    "The 2026 National University Championships",
    "The 2026 USA Weightlifting Masters National Championships Powered by Rogue Fitness",
  ],
};
