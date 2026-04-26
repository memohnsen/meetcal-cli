import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { Rankings } from "../types/rankings";

/* 
 * Search for International Rankings with age, meet, and gender
 * 
 * examples:
 *   meetcal intlRankings --age Senior --gender Men --meet Worlds
 *   meetcal wsoRecords U17 Women Pan Ams 
 */

export default defineCommand({
  name: "intlRankings" as const,
  description: "Search for WSO Records for a given age, wso, and gender",
  options: {
    age: option(z.string().min(1).optional(), {
      description: "Age group to search for",
      short: "a",
    }),
    gender: option(z.string().min(1).optional(), {
      description: "Gender group to search for",
      short: "g"
    }),
    meet: option(z.string().min(1).optional(), {
      description: "Meet to search for",
      short: "m"
    })
  },
  handler: async ({ flags, positional }) => {
    const [positionalAge, positionalGender, positionalMeet] = positional;
    const age = flags.age ?? positionalAge;
    const gender = flags.gender ?? positionalGender;
    const meet = flags.meet ?? positionalMeet;

    if (!age || !gender || !meet) {
      throw new Error('Usage: meetcal intlRankings --age Senior --gender Men --meet Worlds');
    }

    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const results = await convex.query(anyApi.intlRankings.getFiltered, {
      ageCategory: age,
      gender: gender,
      meet: meet
    });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Rank", "Name", "Weight Class", "Percent A Standard", "Total"],
      colWidths: [8, 40, 15, 20, 10]
    })

    const sortedResults = [...results].sort((a: Rankings, b: Rankings) => { a[0] - b[0] });

    sortedResults.forEach((result: Rankings) => {
      table.push(
        [result.ranking, result.name, result.weightClass, result.percentA, result.total]
      )
    })

    console.log(`INTERNATIONAL RANKINGS FOR ${age} ${gender} ${meet}`)
    console.log(table.toString());
  },
});
