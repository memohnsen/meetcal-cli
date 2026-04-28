import { defineCommand, option } from "@bunli/core";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { z } from "zod";
import { Athletes } from "../types/athletes";
import LiftingResults, { type AttemptKey } from "../types/liftingResults";
import type {
  ClubHistoricalResultsByName,
  ClubMedalStats,
  ClubMeetPerformanceStats,
  ClubPrStats,
} from "../types/clubResults";
import type { ClubMedalDetail, ClubPrDetail } from "../types/wso";

const Table = require("cli-table3");

const snatchAttempts: AttemptKey[] = ["snatch1", "snatch2", "snatch3"];
const cjAttempts: AttemptKey[] = ["cj1", "cj2", "cj3"];

function parseArgs(flags: { club?: string; meet?: string }, positional: string[]): { club?: string; meet?: string } {
  if (flags.club || flags.meet) {
    return {
      club: flags.club,
      meet: flags.meet,
    };
  }

  return {
    club: positional[0],
    meet: positional.slice(1).join(" ").trim() || undefined,
  };
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function numberValue(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

function positiveValues(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number" && value > 0);
}

function average(values: number[]): number {
  return values.length > 0 ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : 0;
}

function makeRate(made: number, total: number): number {
  return total > 0 ? Number(((made / total) * 100).toFixed(2)) : 0;
}

function maxPositive(values: Array<number | null | undefined>): number {
  const successful = positiveValues(values);
  return successful.length > 0 ? Math.max(...successful) : 0;
}

function deriveSnatchBest(result: LiftingResults): number {
  return numberValue(result.snatchBest) || maxPositive([result.snatch1, result.snatch2, result.snatch3]);
}

function deriveCjBest(result: LiftingResults): number {
  return numberValue(result.cjBest) || maxPositive([result.cj1, result.cj2, result.cj3]);
}

function deriveTotal(result: LiftingResults): number {
  if (typeof result.total === "number") {
    return result.total;
  }

  const snatchBest = deriveSnatchBest(result);
  const cjBest = deriveCjBest(result);
  return snatchBest > 0 && cjBest > 0 ? snatchBest + cjBest : 0;
}

function buildResultsByName(results: LiftingResults[]): ClubHistoricalResultsByName {
  const byName: ClubHistoricalResultsByName = new Map();

  for (const result of results) {
    const rows = byName.get(result.name) ?? [];
    rows.push(result);
    byName.set(result.name, rows);
  }

  return byName;
}

function calculatePrs(meetResults: LiftingResults[], historicalResults: ClubHistoricalResultsByName, meet: string): ClubPrStats {
  let snatchPrs = 0;
  let cjPrs = 0;
  let totalPrs = 0;
  const details: ClubPrDetail[] = [];
  const normalizedMeet = normalize(meet);

  for (const result of meetResults) {
    const currentTotal = deriveTotal(result);
    if (currentTotal <= 0) {
      continue;
    }

    const previousResults = (historicalResults.get(result.name) ?? []).filter((row) => normalize(row.meet) !== normalizedMeet);
    const previousSnatch = maxPositive(previousResults.map(deriveSnatchBest));
    const previousCj = maxPositive(previousResults.map(deriveCjBest));
    const previousTotal = maxPositive(previousResults.map(deriveTotal));
    const currentSnatch = deriveSnatchBest(result);
    const currentCj = deriveCjBest(result);

    if (currentSnatch > 0 && currentSnatch > previousSnatch) {
      snatchPrs += 1;
      details.push({ name: result.name, movement: "Snatch", newPr: currentSnatch, previousPr: previousSnatch });
    }

    if (currentCj > 0 && currentCj > previousCj) {
      cjPrs += 1;
      details.push({ name: result.name, movement: "Clean & Jerk", newPr: currentCj, previousPr: previousCj });
    }

    if (currentTotal > 0 && currentTotal > previousTotal) {
      totalPrs += 1;
      details.push({ name: result.name, movement: "Total", newPr: currentTotal, previousPr: previousTotal });
    }
  }

  return { snatchPrs, cjPrs, totalPrs, details };
}

function calculateMedals(memberResults: LiftingResults[], allMeetResults: LiftingResults[], meet: string): ClubMedalStats {
  const memberNames = new Set(memberResults.map((result) => result.name));
  const byAge = new Map<string, LiftingResults[]>();
  const details: ClubMedalDetail[] = [];

  for (const result of allMeetResults) {
    if (deriveTotal(result) <= 0) {
      continue;
    }

    const age = String(result.age ?? "");
    const rows = byAge.get(age) ?? [];
    rows.push(result);
    byAge.set(age, rows);
  }

  let totalMedals = 0;
  let snatchMedals = 0;
  let cjMedals = 0;
  let gold = 0;
  let silver = 0;
  let bronze = 0;

  function countPlace(place: number): void {
    if (place === 1) gold += 1;
    if (place === 2) silver += 1;
    if (place === 3) bronze += 1;
  }

  for (const athletes of byAge.values()) {
    const totalRankings = [...athletes].sort((left, right) => deriveTotal(right) - deriveTotal(left)).slice(0, 3);
    const snatchRankings = [...athletes].filter((row) => deriveSnatchBest(row) > 0).sort((left, right) => deriveSnatchBest(right) - deriveSnatchBest(left)).slice(0, 3);
    const cjRankings = [...athletes].filter((row) => deriveCjBest(row) > 0).sort((left, right) => deriveCjBest(right) - deriveCjBest(left)).slice(0, 3);

    totalRankings.forEach((athlete, index) => {
      if (memberNames.has(athlete.name)) {
        totalMedals += 1;
        countPlace(index + 1);
        details.push({ name: athlete.name, age: String(athlete.age ?? ""), movement: "Total", place: index + 1, result: deriveTotal(athlete) });
      }
    });

    snatchRankings.forEach((athlete, index) => {
      if (memberNames.has(athlete.name)) {
        snatchMedals += 1;
        countPlace(index + 1);
        details.push({ name: athlete.name, age: String(athlete.age ?? ""), movement: "Snatch", place: index + 1, result: deriveSnatchBest(athlete) });
      }
    });

    cjRankings.forEach((athlete, index) => {
      if (memberNames.has(athlete.name)) {
        cjMedals += 1;
        countPlace(index + 1);
        details.push({ name: athlete.name, age: String(athlete.age ?? ""), movement: "Clean & Jerk", place: index + 1, result: deriveCjBest(athlete) });
      }
    });
  }

  return {
    totalMedals,
    snatchMedals,
    cjMedals,
    allMedals: totalMedals + snatchMedals + cjMedals,
    gold,
    silver,
    bronze,
    details,
    byMeet: {
      [meet]: {
        total: totalMedals,
        snatch: snatchMedals,
        cj: cjMedals,
      },
    },
  };
}

function calculateAttemptStats(results: LiftingResults[], attempts: AttemptKey[]) {
  let made = 0;
  let missed = 0;

  for (const result of results) {
    for (const attempt of attempts) {
      const value = result[attempt];
      if (typeof value !== "number" || value === 0) {
        continue;
      }

      if (value > 0) {
        made += 1;
      } else {
        missed += 1;
      }
    }
  }

  return {
    made,
    missed,
    total: made + missed,
  };
}

function calculateStatistics(results: LiftingResults[]): ClubMeetPerformanceStats {
  const uniqueAthletes = new Set(results.map((result) => result.name));
  const snatchStats = calculateAttemptStats(results, snatchAttempts);
  const cjStats = calculateAttemptStats(results, cjAttempts);
  const snatch1Stats = calculateAttemptStats(results, ["snatch1"]);
  const cj1Stats = calculateAttemptStats(results, ["cj1"]);
  const totalAttempts = snatchStats.total + cjStats.total;
  const totalMade = snatchStats.made + cjStats.made;
  const athletesWithTotal = new Set(results.filter((result) => deriveTotal(result) > 0).map((result) => result.name));

  return {
    totalAthletes: uniqueAthletes.size,
    totalResults: results.length,
    avgTotal: average(positiveValues(results.map(deriveTotal))),
    avgSnatch: average(positiveValues(results.map(deriveSnatchBest))),
    avgCleanJerk: average(positiveValues(results.map(deriveCjBest))),
    avgBodyWeight: average(positiveValues(results.map((result) => result.bodyWeight))),
    snatchMakeRate: makeRate(snatchStats.made, snatchStats.total),
    cjMakeRate: makeRate(cjStats.made, cjStats.total),
    totalMakeRate: makeRate(totalMade, totalAttempts),
    snatchAttempts: snatchStats,
    cjAttempts: cjStats,
    snatch1MakeRate: makeRate(snatch1Stats.made, snatch1Stats.total),
    cj1MakeRate: makeRate(cj1Stats.made, cj1Stats.total),
    snatch1Attempts: snatch1Stats,
    cj1Attempts: cj1Stats,
    postedTotal: athletesWithTotal.size,
    postedTotalRate: makeRate(athletesWithTotal.size, uniqueAthletes.size),
  };
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function movementRank(movement: string): number {
  if (movement === "Snatch") return 0;
  if (movement === "Clean & Jerk") return 1;
  if (movement === "Total") return 2;
  return 3;
}

function compareDetailRows(left: { name: string; movement: string }, right: { name: string; movement: string }): number {
  return left.name.localeCompare(right.name) || movementRank(left.movement) - movementRank(right.movement);
}

function printStats(club: string, meet: string, stats: ClubMeetPerformanceStats, prs: ClubPrStats, medals: ClubMedalStats): void {
  const summaryTable = new Table({
    head: ["Club", "Meet", "Athletes", "Results", "Posted Total"],
    colWidths: [30, 45, 10, 10, 18],
    wordWrap: true,
  });

  summaryTable.push([club, meet, stats.totalAthletes, stats.totalResults, `${formatPercent(stats.postedTotalRate)} (${stats.postedTotal}/${stats.totalAthletes})`]);

  const liftsTable = new Table({
    head: ["Avg BW", "Avg Snatch", "Avg C&J", "Avg Total"],
    colWidths: [12, 14, 14, 14],
  });

  liftsTable.push([stats.avgBodyWeight, stats.avgSnatch, stats.avgCleanJerk, stats.avgTotal]);

  const makeRateTable = new Table({
    head: ["Snatch", "C&J", "Overall", "Snatch Opener", "C&J Opener"],
    colWidths: [20, 20, 20, 20, 20],
  });

  makeRateTable.push([
    `${formatPercent(stats.snatchMakeRate)} (${stats.snatchAttempts.made}/${stats.snatchAttempts.total})`,
    `${formatPercent(stats.cjMakeRate)} (${stats.cjAttempts.made}/${stats.cjAttempts.total})`,
    `${formatPercent(stats.totalMakeRate)} (${stats.snatchAttempts.made + stats.cjAttempts.made}/${stats.snatchAttempts.total + stats.cjAttempts.total})`,
    `${formatPercent(stats.snatch1MakeRate)} (${stats.snatch1Attempts.made}/${stats.snatch1Attempts.total})`,
    `${formatPercent(stats.cj1MakeRate)} (${stats.cj1Attempts.made}/${stats.cj1Attempts.total})`,
  ]);

  const prTable = new Table({
    head: ["Snatch PRs", "C&J PRs", "Total PRs"],
    colWidths: [12, 12, 12],
  });

  prTable.push([prs.snatchPrs, prs.cjPrs, prs.totalPrs]);

  const medalTable = new Table({
    head: ["Gold", "Silver", "Bronze", "Total Medals", "Snatch", "C&J", "Total"],
    colWidths: [8, 8, 8, 14, 10, 10, 10],
  });

  medalTable.push([medals.gold, medals.silver, medals.bronze, medals.allMedals, medals.snatchMedals, medals.cjMedals, medals.totalMedals]);

  const prDetailTable = new Table({
    head: ["Athlete", "Movement", "New PR", "Previous PR"],
    colWidths: [30, 18, 10, 12],
    wordWrap: true,
  });

  for (const detail of prs.details.sort(compareDetailRows)) {
    prDetailTable.push([detail.name, detail.movement, detail.newPr, detail.previousPr]);
  }

  const medalDetailTable = new Table({
    head: ["Athlete", "Age", "Movement", "Place", "Result"],
    colWidths: [30, 30, 18, 8, 10],
    wordWrap: true,
  });

  for (const detail of medals.details.sort(compareDetailRows)) {
    medalDetailTable.push([detail.name, detail.age, detail.movement, detail.place, detail.result]);
  }

  console.log("PERFORMANCE STATISTICS");
  console.log(summaryTable.toString());
  console.log("AVERAGES");
  console.log(liftsTable.toString());
  console.log("MAKE RATES");
  console.log(makeRateTable.toString());
  console.log("PERSONAL RECORDS");
  console.log(prTable.toString());
  console.log("MEDALS");
  console.log(medalTable.toString());
  if (prs.details.length > 0) {
    console.log("ATHLETES WITH PRS");
    console.log(prDetailTable.toString());
  }
  if (medals.details.length > 0) {
    console.log("ATHLETES WITH MEDALS");
    console.log(medalDetailTable.toString());
  }
}

export default defineCommand({
  name: "clubResults" as const,
  description: "Analyze club performance stats for a meet",
  options: {
    club: option(z.string().min(1).optional(), {
      description: "Club name",
      short: "c",
    }),
    meet: option(z.string().min(1).optional(), {
      description: "Meet name",
      short: "m",
    }),
  },
  handler: async ({ flags, positional }) => {
    const { club, meet } = parseArgs(flags, positional);

    if (!club || !meet) {
      throw new Error('Usage: meetcal clubResults --club "POWER AND GRACE PERFORMANCE." --meet "2025 UMWF World Championships"');
    }

    const convexUrl = process.env.CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const athletes: Athletes[] = await convex.query(anyApi.athletes.getByMeet, { meet });
    const clubAthletes = athletes.filter((athlete) => normalize(athlete.club) === normalize(club));
    const names = [...new Set(clubAthletes.map((athlete) => athlete.name).filter(Boolean))];

    if (names.length === 0) {
      console.error(`No athletes found for club "${club}" in meet "${meet}".`);
      process.exit(1);
    }

    const allMeetResults: LiftingResults[] = await convex.query(anyApi.liftingResults.getByMeet, { meet });
    const memberResults = allMeetResults.filter((result) => names.includes(result.name));

    if (memberResults.length === 0) {
      console.error(`No lifting results found for club "${club}" in meet "${meet}".`);
      process.exit(1);
    }

    const historicalRows: LiftingResults[] = await convex.query(anyApi.liftingResults.getByNames, { names });
    const historicalResults = buildResultsByName(historicalRows);
    const stats = calculateStatistics(memberResults);
    const prs = calculatePrs(memberResults, historicalResults, meet);
    const medals = calculateMedals(memberResults, allMeetResults, meet);

    printStats(club, meet, stats, prs, medals);
  },
});
