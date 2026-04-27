import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import LiftingResults, { AdaptiveRecord } from "../types/liftingResults";

/* 
 * Search for Adaptive American Records with gender
 * 
 * examples:
 *   meetcal adaptive --gender Men
 *   meetcal adaptive Women
 */

export default defineCommand({
  name: "adaptive" as const,
  description: "Search for Adaptive American Records for a given weight class and gender",
  options: {
    gender: option(z.string().min(1).optional(), {
      description: "Gender to search for",
      short: "g",
    }),
  },
  handler: async ({ flags, positional }) => {
    const [positionalGender] = positional;
    const gender = flags.gender ?? positionalGender;

    if (!gender) {
      throw new Error('Usage: meetcal intlRankings --age Senior --gender Men --meet Worlds');
    }

    const convexUrl = process.env.CONVEX_URL;

    if (!convexUrl) {
      throw new Error("Missing CONVEX_URL. Add it to .env.local or export it before running the CLI.");
    }

    const convex = new ConvexHttpClient(convexUrl);
    const results = await convex.query(anyApi.liftingResults.getAdaptive);

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Weight Class", "Snatch", "CJ", "Total"],
      colWidths: [30, 10, 10, 10]
    })

    const getGender = (age: string) => {
      if (gender.toLowerCase() === "men") {
        return /\bmen\b/i.test(age) && !/\bwomen\b/i.test(age);
      } else {
        return /\bwomen\b/i.test(age);
      }
    }

    const getYear = (date: string) => {
      return Number(date.match(/\b\d{4}\b/)?.[0] ?? 0)
    }

    const getWeightClass = (age: string) => {
      return age.match(/\b\d+\+?(?=kg)(?![^()]*\))/i)?.[0]
    }

    const recordsByClass = new Map<string, AdaptiveRecord>()

    results.filter((result: LiftingResults) => getGender(result.age)).filter((result: LiftingResults) => getYear(result.date) >= 2024).forEach((result: LiftingResults) => {
      const weightClass = getWeightClass(result.age)

      if (!weightClass) return

      const current = recordsByClass.get(weightClass) ?? {
        weightClass, snatch: 0, cj: 0, total: 0
      }

      recordsByClass.set(weightClass, {
        weightClass,
        snatch: Math.max(current.snatch, result.snatchBest),
        cj: Math.max(current.cj, result.cjBest),
        total: Math.max(current.total, result.total)
      })
    })

    const sortedRecords = [...recordsByClass.values()].sort((a, b) => {
      const aClass = a.weightClass.match(/^(\d+)(\+)?$/);
      const bClass = b.weightClass.match(/^(\d+)(\+)?$/);

      if (aClass && bClass) {
        const weightDifference = Number(aClass[1]) -
          Number(bClass[1]);

        if (weightDifference !== 0) {
          return weightDifference;
        }

        return Number(Boolean(aClass[2])) -
          Number(Boolean(bClass[2]));
      }

      return a.weightClass.localeCompare(b.weightClass);
    });

    sortedRecords.forEach((record) => {
      table.push([record.weightClass, record.snatch, record.cj,
      record.total]);
    });

    console.log(`ADAPTIVE AMERICAN RECORDS FOR ${gender}`)
    console.log(table.toString());
  },
});
