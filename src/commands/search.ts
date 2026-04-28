import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type LiftingResults from "../types/liftingResults";
import type { AttemptKey } from "../types/liftingResults";

const snatchAttempts: AttemptKey[] = ["snatch1", "snatch2", "snatch3"];
const cjAttempts: AttemptKey[] = ["cj1", "cj2", "cj3"];

/* 
 * Search for an athlete with first and last name
 * Returns athlete PRs and full meet history
 * examples:
 *   meetcal search --name "Maddisen Mohnsen"
 *   meetcal search Maddisen Mohnsen
 */

export default defineCommand({
  name: "search" as const,
  description: "Search for an athlete's name to see their Comp PRs and Results",
  options: {
    name: option(z.string().min(1).optional(), {
      description: "Athlete name to search for",
      short: "n",
    }),
  },
  handler: async ({ flags, positional }) => {
    const name = flags.name ?? positional.join(" ");

    if (!name) {
      throw new Error('Usage: meetcal search --name "First Last"');
    }

    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const results = await convex.query(anyApi.liftingResults.getByNames, {
      names: [name],
    });

    // Meet Results
    const Table = require('cli-table3')

    const table = new Table({
      head: ["Meet", "Date", "Age", "Sn1", "Sn2", "Sn3", "CJ1", "CJ2", "CJ3", "Total"],
      colWidths: [30, 15, 30, 6, 6, 6, 6, 6, 6, 8]
    })

    results.forEach((result: LiftingResults) => {
      table.push(
        [result.meet, result.date, result.age, result.snatch1, result.snatch2, result.snatch3, result.cj1, result.cj2, result.cj3, result.total]
      )
    })

    // PRs
    const personalRecords = () => {
      const maxForAttempts = (attempts: AttemptKey[]) => {
        return Math.max(
          0,
          ...results.flatMap((result: LiftingResults) => attempts.map((attempt) => result[attempt]))
        )
      }

      return {
        snatchPR: maxForAttempts(snatchAttempts),
        cjPR: maxForAttempts(cjAttempts),
        totalPR: Math.max(0, ...results.map((result: LiftingResults) => result.total)),
      }
    }

    const prTable = new Table({
      head: ["Snatch PR", "CJ PR", "Total PR"],
      colWidths: [15, 15, 15]
    })

    prTable.push(
      [personalRecords().snatchPR, personalRecords().cjPR, personalRecords().totalPR]
    )

    const makeRateTable = new Table({
      head: ["Snatch Make Rate", "CJ Make Rate", "Total Make Rate"],
      colWidths: [25, 25, 25]
    })

    // Make rates
    const calcMakeRateForAttempts = (attempts: AttemptKey[]) => {
      let count = 0
      let madeCount = 0

      results.forEach((result: LiftingResults) => {
        attempts.forEach((attempt) => {
          const attemptValue = result[attempt]

          if (attemptValue) { count += 1 }
          if (attemptValue > 0) { madeCount += 1 }
        })
      });

      if (count === 0) {
        return 0
      }

      return madeCount / count * 100
    }

    const calcMakeRate = () => {
      const snatchRate = calcMakeRateForAttempts(snatchAttempts)
      const cjRate = calcMakeRateForAttempts(cjAttempts)
      const totalRate = (snatchRate + cjRate) / 2

      return { snatchRate, cjRate, totalRate }
    }

    const makeRate = calcMakeRate()

    makeRateTable.push(
      [`${makeRate.snatchRate.toFixed(2)}%`, `${makeRate.cjRate.toFixed(2)}%`, `${makeRate.totalRate.toFixed(2)}%`]
    )

    const calcMakeRatePerAttempt = (attempt: AttemptKey) => {
      return `${calcMakeRateForAttempts([attempt]).toFixed(2)}%`
    }

    const makeRatePerAttemptTable = new Table({
      head: ["Sn1 Make Rate", "Sn2", "Sn3", "CJ1", "CJ2", "CJ3"],
      colWidths: [15, 10, 10, 10, 10, 10]
    })

    makeRatePerAttemptTable.push(
      [calcMakeRatePerAttempt("snatch1"), calcMakeRatePerAttempt("snatch2"), calcMakeRatePerAttempt("snatch3"), calcMakeRatePerAttempt("cj1"), calcMakeRatePerAttempt("cj2"), calcMakeRatePerAttempt("cj3")]
    )

    // Outputs
    console.log(`Liftings Results for ${name}`)
    console.log(prTable.toString())
    console.log(makeRateTable.toString())
    console.log(makeRatePerAttemptTable.toString())
    console.log(table.toString());
  },
});
