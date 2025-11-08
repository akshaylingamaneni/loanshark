import { getBorrowerTransactions, getMarketTransactions } from "@/lib/morpho/borrower-transactions";
import { getAllBorrowers } from "../lib/morpho/borrowers";

async function main() {
  console.log("Fetching borrowers...\n");
  const borrowers = await getAllBorrowers(137);

  if (borrowers.length === 0) {
    console.log("No borrowers found");
    return;
  }

  const borrower = borrowers[0];
  console.log("Testing with borrower:", borrower.address);
  console.log("Market:", borrower.marketKey);
  console.log("\n");

  // Test 1: Get ALL transactions for the market (no user filter)
  console.log("Test 1: Getting ALL transactions for market (last 90 days)...");
  const now = Math.floor(Date.now() / 1000);
  const start = now - 90 * 24 * 60 * 60; // 90 days ago
  const allTransactions = await getMarketTransactions(
    borrower.marketKey,
    137,
    start,
    now
  );
  console.log(`Found ${allTransactions.length} total transactions`);
  if (allTransactions.length > 0) {
    console.log("Sample transaction:", JSON.stringify(allTransactions[0], null, 2));
  }
  console.log("\n");

  // Test 2: Get transactions for specific borrower (last 90 days)
  console.log("Test 2: Getting transactions for specific borrower (last 90 days)...");
  const borrowerTransactions = await getBorrowerTransactions(
    borrower.address,
    borrower.marketKey,
    137,
    start,
    now
  );
  console.log(`Found ${borrowerTransactions.length} transactions for ${borrower.address}`);
  if (borrowerTransactions.length > 0) {
    console.log("Transactions:", JSON.stringify(borrowerTransactions, null, 2));
  }
  console.log("\n");

  // Test 3: Check if any user in market transactions matches our borrower
  if (allTransactions.length > 0) {
    console.log("Test 3: Checking if borrower address appears in market transactions...");
    const matchingTx = allTransactions.find(
      tx => tx.user.address.toLowerCase() === borrower.address.toLowerCase()
    );
    if (matchingTx) {
      console.log("Found matching transaction:", JSON.stringify(matchingTx, null, 2));
    } else {
      console.log("Borrower address NOT found in market transactions");
      console.log("Sample addresses from transactions:");
      allTransactions.slice(0, 5).forEach(tx => {
        console.log(`  - ${tx.user.address}`);
      });
    }
  }
}

main().catch(console.error);

