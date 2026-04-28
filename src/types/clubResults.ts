import type LiftingResults from "./liftingResults";
import type { ClubMedalDetail, ClubPrDetail } from "./wso";

export type AttemptStats = {
  made: number;
  missed: number;
  total: number;
};

export type ClubMeetPerformanceStats = {
  totalAthletes: number;
  totalResults: number;
  avgTotal: number;
  avgSnatch: number;
  avgCleanJerk: number;
  avgBodyWeight: number;
  snatchMakeRate: number;
  cjMakeRate: number;
  totalMakeRate: number;
  snatchAttempts: AttemptStats;
  cjAttempts: AttemptStats;
  snatch1MakeRate: number;
  cj1MakeRate: number;
  snatch1Attempts: AttemptStats;
  cj1Attempts: AttemptStats;
  postedTotal: number;
  postedTotalRate: number;
};

export type ClubPrStats = {
  snatchPrs: number;
  cjPrs: number;
  totalPrs: number;
  details: ClubPrDetail[];
};

export type ClubMedalCounts = {
  total: number;
  snatch: number;
  cj: number;
};

export type ClubMedalStats = {
  totalMedals: number;
  snatchMedals: number;
  cjMedals: number;
  allMedals: number;
  gold: number;
  silver: number;
  bronze: number;
  details: ClubMedalDetail[];
  byMeet: Record<string, ClubMedalCounts>;
};

export type ClubHistoricalResultsByName = Map<string, LiftingResults[]>;
