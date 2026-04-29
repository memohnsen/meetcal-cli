import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { CONVEX_URL } from "../config";
import { Record } from "../types/records";

/* 
 * Search for WSO Records with age, WSO, and gender
 * 
 * examples:
 *   meetcal wsoRecords --age Senior --gender Men --wso Carolinas
 *   meetcal wsoRecords U17 Women Carolinas
 */

export default defineCommand({
  name: "wsoRecords" as const,
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
    wso: option(z.string().min(1).optional(), {
      description: "WSO region to search for",
      short: "w"
    })
  },
  handler: async ({ flags, positional }) => {
    const [positionalAge, positionalGender, positionalWSO] = positional;
    const age = flags.age ?? positionalAge;
    const gender = flags.gender ?? positionalGender;
    const wso = flags.wso ?? positionalWSO;

    if (!age || !gender || !wso) {
      throw new Error('Usage: meetcal wsoRecords --age Senior --gender Men --wso Carolina');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    const results = await convex.query(anyApi.wsoRecords.getByWso, {
      ageCategory: age,
      gender: gender,
      wso: wso
    });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Weight Class", "Snatch", "CJ", "Total"],
      colWidths: [30, 15, 15, 15]
    })

    // same thing as the others, sort by classes, put + at the end
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

    console.log(`AMERICAN RECORDS FOR ${age} ${gender} ${wso}`)
    console.log(table.toString());
  },
});
