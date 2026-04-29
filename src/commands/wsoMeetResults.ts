import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { CONVEX_URL } from "../config";
import { AthleteRow, RESULT_MEET_ALIASES } from "../types/wso";
import type { ClubMedalDetail, ClubPrDetail } from "../types/wso";
import LiftingResults from "../types/liftingResults";
import { formatPercent, maxNullable, maxPositive } from "../utils/format";
import { normalize } from "../utils/normalize";
import { movementRank } from "../utils/sortByMovement";
import { deriveTotal, deriveSnatchBest, deriveCjBest } from "../utils/deriveBests";

/* 
 * Get WSO results for meet
 * 
 * examples:
 *   meetcal wso --meet "2026 Virus Weightlifting Finals, Powered by Rogue Fitness" --wso Carolina
 *   meetcal wso "2026 Virus Weightlifting Finals, Powered by Rogue Fitness" Carolina
 */

export default defineCommand({
  name: "wso" as const,
  description: "Get full meet results for a given WSO",
  options: {
    meet: option(z.string().min(1).optional(), {
      description: "Meet to search for",
      short: "m",
    }),
    wso: option(z.string().min(1).optional(), {
      description: "WSO to search for",
      short: "w"
    }),
  },
  handler: async ({ flags, positional }) => {
    const [positionalMeet, positionalWSO] = positional;
    const meet = flags.meet ?? positionalMeet;
    const wso = flags.wso ?? positionalWSO;

    if (!meet || !wso) {
      throw new Error('Usage: meetcal wso "2026 Masters National Championships & National University Championships" Carolina');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);

    function getResultMeetNames(meet: string): string[] {
      return [meet, ...(RESULT_MEET_ALIASES[meet] ?? [])];
    }

    function isRecordedAttempt(value: number | null | undefined): value is number {
      return typeof value === "number" && value !== 0;
    }

    function isPr(current: number | null, priorMax: number | null): boolean {
      if (current == null) {
        return false;
      }

      if (priorMax == null) {
        return true;
      }

      return current > priorMax;
    }

    function buildRowsByName(rows: LiftingResults[]): Map<string, LiftingResults[]> {
      const rowsByName = new Map<string, LiftingResults[]>();

      for (const row of rows) {
        const existing = rowsByName.get(row.name) ?? [];
        existing.push(row);
        rowsByName.set(row.name, existing);
      }

      return rowsByName;
    }

    function compareDetailRows(left: { name: string; movement: string }, right: { name: string; movement: string }): number {
      return left.name.localeCompare(right.name) || movementRank(left.movement) - movementRank(right.movement);
    }

    function calculateMedalDetails(
      memberNames: Set<string>,
      allMeetRows: LiftingResults[],
    ): ClubMedalDetail[] {
      const byMeetAndAge = new Map<string, LiftingResults[]>();
      const details: ClubMedalDetail[] = [];

      for (const row of allMeetRows) {
        if (deriveTotal(row) == null || deriveTotal(row) === 0) {
          continue;
        }

        const key = `${row.meet}\u0000${row.age ?? ""}`;
        const rows = byMeetAndAge.get(key) ?? [];
        rows.push(row);
        byMeetAndAge.set(key, rows);
      }

      for (const rows of byMeetAndAge.values()) {
        const totalRankings = [...rows]
          .filter((row) => (deriveTotal(row) ?? 0) > 0)
          .sort((left, right) => (deriveTotal(right) ?? 0) - (deriveTotal(left) ?? 0))
          .slice(0, 3);
        const snatchRankings = [...rows]
          .filter((row) => (deriveSnatchBest(row) ?? 0) > 0)
          .sort((left, right) => (deriveSnatchBest(right) ?? 0) - (deriveSnatchBest(left) ?? 0))
          .slice(0, 3);
        const cjRankings = [...rows]
          .filter((row) => (deriveCjBest(row) ?? 0) > 0)
          .sort((left, right) => (deriveCjBest(right) ?? 0) - (deriveCjBest(left) ?? 0))
          .slice(0, 3);

        totalRankings.forEach((row, index) => {
          const result = deriveTotal(row);
          if (memberNames.has(row.name) && result != null) {
            details.push({ name: row.name, age: row.age ?? "", movement: "Total", place: index + 1, result });
          }
        });

        snatchRankings.forEach((row, index) => {
          const result = deriveSnatchBest(row);
          if (memberNames.has(row.name) && result != null) {
            details.push({ name: row.name, age: row.age ?? "", movement: "Snatch", place: index + 1, result });
          }
        });

        cjRankings.forEach((row, index) => {
          const result = deriveCjBest(row);
          if (memberNames.has(row.name) && result != null) {
            details.push({ name: row.name, age: row.age ?? "", movement: "Clean & Jerk", place: index + 1, result });
          }
        });
      }

      return details;
    }

    const athletes: AthleteRow[] = await convex.query(anyApi.athletes.getByMeet, {
      meet,
    });

    const normalizedWso = normalize(wso);
    const resultMeetNames = getResultMeetNames(meet);
    const normalizedResultMeetNames = new Set(resultMeetNames.map(normalize));

    if (athletes.length === 0) {
      console.error(`No athletes found for meet: ${meet}`);
      process.exit(1);
    }

    const availableWsos = [...new Set(
      athletes
        .map((athlete) => athlete.wso?.trim())
        .filter((value): value is string => Boolean(value)),
    )].sort((left, right) => left.localeCompare(right));

    const filteredAthletes = athletes.filter(
      (athlete) => normalize(athlete.wso) === normalizedWso,
    );

    if (filteredAthletes.length === 0) {
      console.error(`No athletes found for WSO "${wso}" in meet "${meet}".`);
      if (availableWsos.length > 0) {
        console.error("\nAvailable WSOs in this meet:");
        for (const availableWso of availableWsos) {
          console.error(`- ${availableWso}`);
        }
      }
      process.exit(1);
    }

    const names = [...new Set(
      filteredAthletes
        .map((athlete) => athlete.name?.trim())
        .filter((value): value is string => Boolean(value)),
    )];

    const historyRows: LiftingResults[] = await convex.query(anyApi.liftingResults.getByNames, {
      names,
    });

    const rowsByName = buildRowsByName(historyRows);
    const targetMeetRows: LiftingResults[] = [];
    const missingResultsNames: string[] = [];

    let snatchPrCount = 0;
    let cjPrCount = 0;
    let totalPrCount = 0;
    const prDetails: ClubPrDetail[] = [];

    for (const name of names) {
      const athleteRows = rowsByName.get(name) ?? [];
      const currentRows = athleteRows.filter(
        (row) => normalizedResultMeetNames.has(normalize(row.meet)),
      );

      if (currentRows.length === 0) {
        missingResultsNames.push(name);
        continue;
      }

      targetMeetRows.push(...currentRows);

      const priorRows = athleteRows.filter(
        (row) => !normalizedResultMeetNames.has(normalize(row.meet)),
      );

      const currentSnatch = maxNullable(currentRows.map(deriveSnatchBest));
      const currentCj = maxNullable(currentRows.map(deriveCjBest));
      const currentTotal = maxNullable(currentRows.map(deriveTotal));

      const priorSnatch = maxNullable(priorRows.map(deriveSnatchBest));
      const priorCj = maxNullable(priorRows.map(deriveCjBest));
      const priorTotal = maxNullable(priorRows.map(deriveTotal));

      if (isPr(currentSnatch, priorSnatch)) {
        snatchPrCount += 1;
        if (currentSnatch != null) {
          prDetails.push({ name, movement: "Snatch", newPr: currentSnatch, previousPr: priorSnatch ?? 0 });
        }
      }

      if (isPr(currentCj, priorCj)) {
        cjPrCount += 1;
        if (currentCj != null) {
          prDetails.push({ name, movement: "Clean & Jerk", newPr: currentCj, previousPr: priorCj ?? 0 });
        }
      }

      if (isPr(currentTotal, priorTotal)) {
        totalPrCount += 1;
        if (currentTotal != null) {
          prDetails.push({ name, movement: "Total", newPr: currentTotal, previousPr: priorTotal ?? 0 });
        }
      }
    }

    const allMeetRowsNested: LiftingResults[][] = await Promise.all(
      resultMeetNames.map((resultMeetName) =>
        convex.query(anyApi.liftingResults.getByMeet, { meet: resultMeetName }),
      ),
    );
    const medalDetails = calculateMedalDetails(new Set(names), allMeetRowsNested.flat());

    let snatchAttempts = 0;
    let snatchMakes = 0;
    let cjAttempts = 0;
    let cjMakes = 0;
    let totalWeightLifted = 0;

    for (const row of targetMeetRows) {
      for (const attempt of [row.snatch1, row.snatch2, row.snatch3]) {
        if (isRecordedAttempt(attempt)) {
          snatchAttempts += 1;
          if (attempt > 0) {
            snatchMakes += 1;
            totalWeightLifted += attempt;
          }
        }
      }

      for (const attempt of [row.cj1, row.cj2, row.cj3]) {
        if (isRecordedAttempt(attempt)) {
          cjAttempts += 1;
          if (attempt > 0) {
            cjMakes += 1;
            totalWeightLifted += attempt;
          }
        }
      }
    }

    const snatchMakeRate =
      snatchAttempts > 0 ? (snatchMakes / snatchAttempts) * 100 : 0;
    const cjMakeRate = cjAttempts > 0 ? (cjMakes / cjAttempts) * 100 : 0;
    const totalMakeRate = (snatchMakeRate + cjMakeRate) / 2;

    const Table = require('cli-table3')

    const athleteTable = new Table({
      head: ["Total Athletes", "WSO Athletes"],
      colWidths: [30, 30]
    })

    athleteTable.push([athletes.length, filteredAthletes.length])

    console.log(`${wso} WSO RESULTS FOR ${meet}`)
    console.log(athleteTable.toString());

    const makeRateTable = new Table({
      head: ["Snatch", "CJ", "Total"],
      colWidths: [30, 30, 30]
    })

    makeRateTable.push([
      formatPercent(snatchMakeRate),
      formatPercent(cjMakeRate),
      formatPercent(totalMakeRate)
    ])

    console.log(makeRateTable.toString());

    const volumeTable = new Table({
      head: ["Total Weight Lifted"],
      colWidth: [40]
    })

    volumeTable.push([`${totalWeightLifted}kg`])

    console.log(volumeTable.toString())

    const prTable = new Table({
      head: ["Snatch PRs", "CJ PRs", "Total PRs"],
      colWidths: [30, 30, 30]
    })

    prTable.push([snatchPrCount, cjPrCount, totalPrCount])

    console.log(prTable.toString())

    if (prDetails.length > 0) {
      const prDetailTable = new Table({
        head: ["Athlete", "Movement", "New PR", "Previous PR"],
        colWidths: [30, 18, 10, 12],
        wordWrap: true,
      })

      for (const detail of prDetails.sort(compareDetailRows)) {
        prDetailTable.push([detail.name, detail.movement, detail.newPr, detail.previousPr])
      }

      console.log("ATHLETES WITH PRS")
      console.log(prDetailTable.toString())
    }

    if (medalDetails.length > 0) {
      const medalDetailTable = new Table({
        head: ["Athlete", "Age", "Movement", "Place", "Result"],
        colWidths: [30, 30, 18, 8, 10],
        wordWrap: true,
      })

      for (const detail of medalDetails.sort(compareDetailRows)) {
        medalDetailTable.push([detail.name, detail.age, detail.movement, detail.place, detail.result])
      }

      console.log("ATHLETES WITH MEDALS")
      console.log(medalDetailTable.toString())
    }
  },
});
