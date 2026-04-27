import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { Athletes } from "../types/athletes";

/* 
 * Search for Meet name to see all entries
 * 
 * examples:
 *   meetcal meet --name "American Open Finals"
 *   meetcal meet --name "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness" --sessionNumber 1 --sessionPlatform Red
 *   meetcal meet "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness"
 *   meetcal meet "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness" 1
 *   meetcal meet "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness" 1 Red
 */

export default defineCommand({
  name: "meet" as const,
  description: "Search for entries for a meet",
  options: {
    name: option(z.string().min(1).optional(), {
      description: "Meet to search for",
      short: "n",
    }),
    sessionNumber: option(z.number().min(1).optional(), {
      description: "Session number to search for",
      short: "s"
    }),
    sessionPlatform: option(z.string().min(1).optional(), {
      description: "Session platform to search for",
      short: "p"
    })
  },
  handler: async ({ flags, positional }) => {
    const [positionalMeet, positionalNumber, positionalPlatform] = positional;
    const meet = flags.name ?? positionalMeet
    const sessionNumber = flags.sessionNumber ?? positionalNumber
    const platform = flags.sessionPlatform ?? positionalPlatform

    if (!meet || !sessionNumber || !platform) {
      throw new Error('Usage: meetcal meet "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness"');
    }

    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const results = await convex.query(anyApi.athletes.getByMeet, { meet: meet, sessionNumber: sessionNumber, sessionPlatform: platform });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Name", "Age", "Gender", "Adaptive", "Club", "Class", "Entry Total", "Session Num", "Platform"],
      colWidths: [30, 6, 8, 10, 30, 8, 13, 13, 10]
    })

    results.sort((a: Athletes, b: Athletes) => a.gender.localeCompare(b.gender) || Number(a.weightClass) - Number(b.weightClass) || b.entryTotal - a.entryTotal)

    results.map((result: Athletes) => {
      const sessionNum = result.sessionNumber ?? "Not Set"
      const sessionPlatform = result.sessionPlatform ?? "Not Set"

      table.push([result.name, result.age, result.gender, result.adaptive, result.club, result.weightClass, result.entryTotal, sessionNum, sessionPlatform])
    })

    console.log(`ENTRIES FOR ${meet}`)
    console.log(table.toString());
  },
});
