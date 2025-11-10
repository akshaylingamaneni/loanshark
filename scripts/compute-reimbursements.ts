import { parseJobDate, runReimbursementJob } from "@/lib/reimbursements/runner";

async function main() {
  const dateArg = process.argv.find((arg) => arg.startsWith("--date="))?.split("=")[1];
  const targetDate = dateArg ? parseJobDate(dateArg) : undefined;
  const result = await runReimbursementJob({ day: targetDate });

  console.log(
    `Reimbursement job complete for ${result.day}: ${result.marketsProcessed} markets, ${result.borrowersProcessed} borrowers, ${result.reimbursementsCreated} reimbursements.`
  );

  if (result.skippedMarkets.length > 0) {
    console.warn(`Skipped markets (missing from Morpho response): ${result.skippedMarkets.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Fatal error running reimbursements:", error);
  process.exit(1);
});
