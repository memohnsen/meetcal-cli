#!/usr/bin/env bun
import { createCLI } from "@bunli/core";

import search from "./commands/search.js";
import standards from "./commands/standards.js";

const cli = await createCLI({
  name: "meetcal",
  version: "1.0.0",
  description: "A CLI using data from the MeetCal app to access all meet and athlete info from USAW and USAMW meets",
});

cli.command(search)
cli.command(standards)

await cli.run();
