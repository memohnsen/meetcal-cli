import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { CONVEX_URL } from "../config";
import LiftingResults from "../types/liftingResults";
import { buildRowsByName } from "../utils/buildRowsByName";

/* 
 * Search for National Rankings with weight class
 * 
 * examples:
 *   meetcal natRankings --weightClass Open Men's 110kg
 *   meetcal natRankings Junior Women's 77kg
 */

export default defineCommand({
  name: "natRankings" as const,
  description: "Search for National Rankings for a given weight",
  options: {
    weightClass: option(z.string().min(1).optional(), {
      description: "Weight class to search for",
      short: "a",
    }),
  },
  handler: async ({ flags, positional }) => {
    const [positionalClass] = positional;
    const weightClass = flags.weightClass ?? positionalClass;

    if (!weightClass) {
      throw new Error("Usage: meetcal natRankings --weightClass Junior Men's 110kg");
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    const results = await convex.query(anyApi.liftingResults.getNationalRankings, {
      ageCategory: weightClass,
      federation: "USAW"
    });


    //get list of unique athlete names
    //filter to find those names
    //return row of Math.max of total
    const rowsByName = buildRowsByName(results)
    const bestRowsByName = [...rowsByName.values()].map((row) => {
      return row.reduce((best, current) => {
        return current.total > best.total ? current : best
      })
    })

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Rank", "Name", "Total"],
      colWidths: [8, 40, 10]
    })

    const sortedResults = [...bestRowsByName].sort((a: LiftingResults, b: LiftingResults) => b.total - a.total);
    let ranking = 1

    sortedResults.forEach((result: LiftingResults) => {
      table.push(
        [ranking, result.name, result.total]
      )
      ranking += 1
    })

    console.log(`NATIONAL RANKINGS FOR ${weightClass}`)
    console.log(table.toString());
  },
});
