import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import LiftingResults from "../types/liftingResults";

type AttemptKey = "snatch1" | "snatch2" | "snatch3" | "cj1" | "cj2" | "cj3";
const snatchAttempts: AttemptKey[] = ["snatch1", "snatch2", "snatch3"];
const cjAttempts: AttemptKey[] = ["cj1", "cj2", "cj3"];

/* 
 * Search for Meet name to see results
 * 
 * examples:
 *   meetcal meetResults --name "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness"
 *   meetcal meetResults "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness"
 */

export default defineCommand({
  name: "meetResults" as const,
  description: "Search for results from a meet, returns all athletes' results and event stats",
  options: {
    name: option(z.string().min(1).optional(), {
      description: "Meet to search for",
      short: "n",
    }),
  },
  handler: async ({ flags, positional }) => {
    const [positionalMeet] = positional;
    const meet = flags.name ?? positionalMeet

    if (!meet) {
      throw new Error('Usage: meetcal meetResults "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness"');
    }

    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const results = await convex.query(anyApi.liftingResults.getByMeet, { meet: meet });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Name", "Class", "BW", "Adaptive", "Sn1", "Sn2", "Sn3", "CJ1", "CJ2", "CJ3", "Total"],
      colWidths: [30, 35, 8, 10, 8, 8, 8, 8, 8, 8, 8]
    })

    results.sort((a: LiftingResults, b: LiftingResults) => b.total - a.total)

    results.map((result: LiftingResults) => {
      table.push([result.name, result.age, result.bodyWeight, result.adaptive, result.snatch1, result.snatch2, result.snatch3, result.cj1, result.cj2, result.cj3, result.total])
    })

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

    console.log(`RESULTS FOR ${meet} ${results[0].date}`)
    console.log(makeRateTable.toString())
    console.log(makeRatePerAttemptTable.toString())
    console.log(table.toString());
  },
});
