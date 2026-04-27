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
    console.log("records: Enter age, gender, and federation to see USAW, USAMW, IWF, UMWF Records")
    console.log("qualifyingTotals: Enter age, gender, and event to see Qualifying Totals")
    console.log("intlRankings: Enter age, gender, and meet to see USAW Rankings for the meet")
    console.log("wsoRecords: Enter age, gender, and wso to see WSO Records")
    console.log("natRankings: Enter age and class to see National Rankings")
    console.log("adaptive: Enter gender to see Adaptive American Records")
    console.log(" ")
    console.log("EXAMPLES")
    console.log("meetcal search Maddisen Mohnsen")
    console.log("meetcal standards Senior Men")
    console.log("meetcal records Senior Men USAW")
    console.log("meetcal qualifyingTotals Senior Men Nationals")
    console.log("meetcal intlRankings Senior Men Worlds")
    console.log("meetcal wsoRecords Senior Men Carolina")
    console.log("meetcal natRankings Open Men's 110kg")
    console.log("meetcal adaptive Men")
  },
});
