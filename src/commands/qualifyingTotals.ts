import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { QualifyingTotal } from "../types/qualTotals";

/* 
 * Search for qualifying totals with age, event, and gender
 * 
 * examples:
 *   meetcal qualifyingTotals --age Senior --gender Men --event Nationals
 *   meetcal qualifyingTotals U17 Women AO Finals
 */

export default defineCommand({
  name: "qualifyingTotals" as const,
  description: "Search for Qualifying Totals for a given age, gender, and event",
  options: {
    age: option(z.string().min(1).optional(), {
      description: "Age group to search for",
      short: "a",
    }),
    gender: option(z.string().min(1).optional(), {
      description: "Gender group to search for",
      short: "g"
    }),
    event: option(z.string().min(1).optional(), {
      description: "Event to search for",
      short: "e"
    })
  },
  handler: async ({ flags, positional }) => {
    const [positionalAge, positionalGender, positionalEvent] = positional;
    const age = flags.age ?? positionalAge;
    const gender = flags.gender ?? positionalGender;
    const event = flags.event ?? positionalEvent

    if (!age || !gender || !event) {
      throw new Error('Usage: meetcal qualifyingTotals --age Senior --gender Men --event Nationals');
    }

    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const results = await convex.query(anyApi.qualifyingTotals.getFiltered, {
      ageCategory: age,
      gender: gender,
      eventName: event
    });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Weight Class", "Total"],
      colWidths: [30, 15]
    })

    results.forEach((result: QualifyingTotal) => {
      table.push(
        [result.weightClass, result.qualifyingTotal]
      )
    })

    table.sort((a: QualifyingTotal[], b: QualifyingTotal[]) => a[1] - b[1])

    console.log(`QUALIFYING TOTALS FOR ${age} ${gender} ${event}`)
    console.log(table.toString());
  },
});

