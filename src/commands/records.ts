import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { CONVEX_URL } from "../config";
import { Record } from "../types/records";

/* 
 * Search for Records with age, federation, and gender
 * 
 * examples:
 *   meetcal records --age Senior --gender Men --federation USAW
 *   meetcal records U17 Women IWF
 */

export default defineCommand({
  name: "records" as const,
  description: "Search for Records for a given age, federation, and gender",
  options: {
    age: option(z.string().min(1).optional(), {
      description: "Age group to search for",
      short: "a",
    }),
    gender: option(z.string().min(1).optional(), {
      description: "Gender group to search for",
      short: "g"
    }),
    federation: option(z.string().min(1).optional(), {
      description: "IWF, USAW, USAMW, or UMWF",
      short: "f"
    })
  },
  handler: async ({ flags, positional }) => {
    const [positionalAge, positionalGender, positionalFederation] = positional;
    const age = flags.age ?? positionalAge;
    const gender = flags.gender ?? positionalGender;
    const federation = flags.federation ?? positionalFederation;

    if (!age || !gender) {
      throw new Error('Usage: meetcal americanRecords --age Senior --gender Men');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    const results = await convex.query(anyApi.records.getByFederation, {
      ageCategory: age.toLowerCase(),
      gender: gender.toLowerCase(),
      recordType: federation.toUpperCase()
    });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Weight Class", "Snatch", "CJ", "Total"],
      colWidths: [30, 15, 15, 15]
    })

    // sort by weight class, find class with + and move to end
    const sortedResults = [...results].sort((a: Record, b: Record) => {
      const aWeightClass = a.weightClass.match(/^(\d+)(\+)?(?:kg)?$/i);
      const bWeightClass = b.weightClass.match(/^(\d+)(\+)?(?:kg)?$/i);

      if (aWeightClass && bWeightClass) {
        const weightDifference = Number(aWeightClass[1]) - Number(bWeightClass[1]);

        if (weightDifference !== 0) {
          return weightDifference;
        }

        return Number(Boolean(aWeightClass[2])) - Number(Boolean(bWeightClass[2]));
      }

      return a.weightClass.localeCompare(b.weightClass);
    });

    sortedResults.forEach((result: Record) => {
      table.push(
        [result.weightClass, result.snatchRecord, result.cjRecord, result.totalRecord]
      )
    })

    console.log(`AMERICAN RECORDS FOR ${age} ${gender} ${federation}`)
    console.log(table.toString());
  },
});
