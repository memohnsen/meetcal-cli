#!/usr/bin/env bun
import { createCLI } from "@bunli/core";

import search from "./commands/search.js";

const cli = await createCLI({
  name: "meetcal-cli",
  version: "1.0.0",
  description: "A CLI using data from the MeetCal app to access all meet and athlete info from USAW and USAMW meets",
});

cli.command(search)

await cli.run();
