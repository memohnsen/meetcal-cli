import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { Rankings } from "../types/rankings";

/* 
 * Search for National Rankings with weight class
 * 
 * examples:
 *   meetcal natRankings --weightClass Open Men's 110kg
 *   meetcal natRankings Junior Women's 77kg
 */

export default defineCommand({
  name: "natRankings" as const,
  description: "Search for WSO Records for a given weight class and gender",
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
      throw new Error('Usage: meetcal intlRankings --age Senior --gender Men --meet Worlds');
    }

    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const results = await convex.query(anyApi.liftingResults.getNationalRankings, {
      ageCategory: weightClass,
      federation: "USAW"
    });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Rank", "Name", "Total"],
      colWidths: [8, 40, 10]
    })

    const sortedResults = [...results].sort((a: Rankings, b: Rankings) => { a[0] - b[0] });
    let ranking = 1

    sortedResults.forEach((result: Rankings) => {
      table.push(
        [ranking, result.name, result.total]
      )
      ranking += 1
    })

    console.log(`NATIONAL RANKINGS FOR ${weightClass}`)
    console.log(table.toString());
  },
});
