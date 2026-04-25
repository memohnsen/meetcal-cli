import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type LiftingResults from "../types/liftingResults";

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

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Meet", "Date", "Age", "Sn1", "Sn2", "Sn3", "CJ1", "CJ2", "CJ3", "Total"],
      colWidths: [30, 15, 30, 6, 6, 6, 6, 6, 6, 8]
    })

    results.map((result: LiftingResults) => {
      table.push(
        [result.meet, result.date, result.age, result.snatch1, result.snatch2, result.snatch3, result.cj1, result.cj2, result.cj3, result.total]
      )
    })

    const personalRecords = () => {
      let snatchPR = 0
      let cjPR = 0
      let totalPR = 0

      results.map((result: LiftingResults) => {
        if (result.snatch1 > snatchPR) { snatchPR = result.snatch1 }
        if (result.snatch2 > snatchPR) { snatchPR = result.snatch2 }
        if (result.snatch3 > snatchPR) { snatchPR = result.snatch3 }
        if (result.cj1 > cjPR) { cjPR = result.cj1 }
        if (result.cj2 > cjPR) { cjPR = result.cj2 }
        if (result.cj3 > cjPR) { cjPR = result.cj3 }
        if (result.total > totalPR) { totalPR = result.total }
      })

      return { snatchPR, cjPR, totalPR }
    }

    const prTable = new Table({
      head: ["Snatch PR", "CJ PR", "Total PR"],
      colWidths: [15, 15, 15]
    })

    prTable.push(
      [personalRecords().snatchPR, personalRecords().cjPR, personalRecords().totalPR]
    )

    console.log(`Liftings Results for ${name}`)
    console.log(prTable.toString())
    console.log(table.toString());
  },
});
