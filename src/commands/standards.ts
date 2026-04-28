import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { CONVEX_URL } from "../config";
import type Standards from "../types/standards";

/* 
 * Search for A/B standards with age and gender
 * Returns A/B standards for given age group and gender
 * examples:
 *   meetcal standards --age Senior --gender Men
 *   meetcal standards U17 Women
 */

export default defineCommand({
  name: "standards" as const,
  description: "Search for A/B USAW Standards for a given age and gender group",
  options: {
    age: option(z.string().min(1).optional(), {
      description: "Age group to search for",
      short: "a",
    }),
    gender: option(z.string().min(1).optional(), {
      description: "Gender group to search for",
      short: "g"
    })
  },
  handler: async ({ flags, positional }) => {
    const [positionalAge, positionalGender] = positional;
    const age = flags.age ?? positionalAge;
    const gender = flags.gender ?? positionalGender;

    if (!age || !gender) {
      throw new Error('Usage: meetcal standards --age "Senior" --gender "Men"');
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    const results = await convex.query(anyApi.standards.getFiltered, {
      ageCategory: age.toLowerCase(),
      gender: gender.toLowerCase()
    });

    const Table = require('cli-table3')

    const table = new Table({
      head: ["Weight Class", "A", "B"],
      colWidths: [30, 15, 15]
    })

    results.forEach((result: Standards) => {
      table.push(
        [result.weightClass, result.standardA, result.standardB]
      )
    })

    table.sort((a: unknown[], b: unknown[]) => Number(a[1]) - Number(b[1]))

    console.log(`STANDARDS FOR ${age} ${gender}`)
    console.log(table.toString());
  },
});
