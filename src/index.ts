#!/usr/bin/env bun
import { createCLI } from "@bunli/core";

import search from "./commands/search.js";
import standards from "./commands/standards.js";
import qualifyingTotals from "./commands/qualifyingTotals.js";
import americanRecords from "./commands/americanRecords.js";
import help from "./commands/help.js";

const cli = await createCLI({
  name: "meetcal",
  version: "1.0.0",
  description: "A CLI using data from the MeetCal app to access all meet and athlete info from USAW and USAMW meets",
});

cli.command(search)
cli.command(standards)
cli.command(qualifyingTotals)
cli.command(americanRecords)
cli.command(help)

await cli.run();
