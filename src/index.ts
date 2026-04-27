#!/usr/bin/env bun
import { createCLI } from "@bunli/core";

import search from "./commands/search.js";
import standards from "./commands/standards.js";
import qualifyingTotals from "./commands/qualifyingTotals.js";
import help from "./commands/help.js";
import wsoRecords from "./commands/wsoRecords.js";
import intlRankings from "./commands/intlRankings.js";
import records from "./commands/records.js";
import natRankings from "./commands/natRankings.js";
import adaptive from "./commands/adaptive.js";
import meet from "./commands/meet.js";
import meetResults from "./commands/meetResults.js";

const cli = await createCLI({
  name: "meetcal",
  version: "1.0.0",
  description: "A CLI using data from the MeetCal app to access all meet and athlete info from USAW and USAMW meets",
});

cli.command(search)
cli.command(standards)
cli.command(qualifyingTotals)
cli.command(records)
cli.command(help)
cli.command(wsoRecords)
cli.command(intlRankings)
cli.command(natRankings)
cli.command(adaptive)
cli.command(meet)
cli.command(meetResults)

await cli.run();
