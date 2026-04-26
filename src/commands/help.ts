import { defineCommand } from "@bunli/core";

/* 
 * Get list of all commands available
 * 
 * examples:
 *   meetcal help
 */

export default defineCommand({
  name: "help" as const,
  description: "Get a list of all commands",
  options: {
  },
  handler: async () => {
    console.log("LIST OF COMMANDS AVAILABLE")
    console.log("search: Enter athlete name to get historical meet results");
    console.log("standards: Enter age and gender to see A/B Standards")
    console.log("americanRecords: Enter age, gender, and federation to see American Records")
    console.log("qualifyingTotals: Enter age, gender, and event to see Qualifying Totals")
    console.log(" ")
    console.log("EXAMPLES")
    console.log("meetcal search Maddisen Mohnsen")
    console.log("meetcal standards Senior Men")
    console.log("meetcal americanRecords Senior Men USAW")
    console.log("meetcal qualifyingTotals Senior Men Nationals")
  },
});
