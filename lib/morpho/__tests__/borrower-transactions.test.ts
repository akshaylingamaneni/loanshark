import { describe, it, expect } from "vitest";
import {
  getMarketTransactions,
  getBorrowerTransactions,
  getFirstBorrowTimestamp,
} from "../borrower-transactions";
import { getAllBorrowers } from "../borrowers";

describe("Borrower Transactions Queries", () => {
  it("should fetch all transactions for a market", async () => {
    const borrowers = await getAllBorrowers(137);

    if (borrowers.length === 0) {
      return;
    }

    const borrower = borrowers[0];
    const marketKey = borrower.marketKey;
    const chainId = 137;
    const now = Math.floor(Date.now() / 1000);
    const start = now - 30 * 24 * 60 * 60;

    console.log(`\nFetching transactions for market: ${marketKey.slice(0, 10)}...`);
    console.log(
      `Time range: ${new Date(start * 1000).toISOString()} to ${new Date(now * 1000).toISOString()}`
    );

    const transactions = await getMarketTransactions(marketKey, chainId, start, now);

    console.log(`\nFound ${transactions.length} total transactions`);

    if (transactions.length > 0) {
      const borrowCount = transactions.filter((tx) => tx.type === "MarketBorrow").length;
      const repayCount = transactions.filter((tx) => tx.type === "MarketRepay").length;

      console.log(`Breakdown:`);
      console.log(`  Borrows: ${borrowCount}`);
      console.log(`  Repays: ${repayCount}`);

      console.log("\nFirst 5 transactions:");
      transactions.slice(0, 5).forEach((tx, i) => {
        const date = new Date(Number(tx.timestamp) * 1000).toISOString();
        console.log(`  ${i + 1}. ${tx.type} - ${tx.user.address.slice(0, 10)}... - ${date}`);
      });
    }

    expect(transactions).toBeDefined();
    expect(Array.isArray(transactions)).toBe(true);

    if (transactions.length > 0) {
      expect(transactions[0]).toHaveProperty("hash");
      expect(transactions[0]).toHaveProperty("timestamp");
      expect(transactions[0]).toHaveProperty("type");
      expect(transactions[0]).toHaveProperty("user");
      expect(["MarketBorrow", "MarketRepay"]).toContain(transactions[0].type);
    }
  }, 30000);

  it("should fetch transactions for a specific borrower", async () => {
    const borrowers = await getAllBorrowers(137);

    if (borrowers.length === 0) {
      return;
    }

    const borrower = borrowers[0];
    const borrowerAddress = borrower.address;
    const marketKey = borrower.marketKey;
    const chainId = 137;
    const now = Math.floor(Date.now() / 1000);
    const start = now - 90 * 24 * 60 * 60;

    console.log(`\nFetching transactions for borrower: ${borrowerAddress}`);
    console.log(`Market: ${marketKey.slice(0, 10)}...`);
    console.log(
      `Time range: ${new Date(start * 1000).toISOString()} to ${new Date(now * 1000).toISOString()}`
    );

    const transactions = await getBorrowerTransactions(
      borrowerAddress,
      marketKey,
      chainId,
      start,
      now
    );

    console.log(`\nFound ${transactions.length} transactions for this borrower`);

    if (transactions.length > 0) {
      const borrowCount = transactions.filter((tx) => tx.type === "MarketBorrow").length;
      const repayCount = transactions.filter((tx) => tx.type === "MarketRepay").length;

      console.log(`Breakdown:`);
      console.log(`  Borrows: ${borrowCount}`);
      console.log(`  Repays: ${repayCount}`);

      console.log("\nAll transactions:");
      transactions.forEach((tx, i) => {
        const date = new Date(Number(tx.timestamp) * 1000).toISOString();
        console.log(`  ${i + 1}. ${tx.type} - ${date}`);
        console.log(`     Hash: ${tx.hash}`);
      });

      const firstBorrow = getFirstBorrowTimestamp(transactions);
      if (firstBorrow) {
        console.log(`\nFirst borrow timestamp: ${new Date(firstBorrow * 1000).toISOString()}`);
      }
    } else {
      console.log("No transactions found for this borrower in the time range");
    }

    expect(transactions).toBeDefined();
    expect(Array.isArray(transactions)).toBe(true);

    transactions.forEach((tx) => {
      expect(tx.user.address.toLowerCase()).toBe(borrowerAddress.toLowerCase());
    });
  }, 30000);

  it("should get first borrow timestamp correctly", () => {
    const transactions = [
      {
        hash: "0x1",
        timestamp: 1000,
        type: "MarketRepay" as const,
        user: { address: "0x123" },
      },
      {
        hash: "0x2",
        timestamp: 500,
        type: "MarketBorrow" as const,
        user: { address: "0x123" },
      },
      {
        hash: "0x3",
        timestamp: 1500,
        type: "MarketBorrow" as const,
        user: { address: "0x123" },
      },
    ];

    const firstBorrow = getFirstBorrowTimestamp(transactions);
    expect(firstBorrow).toBe(500);
  });

  it("should return null if no borrow transactions", () => {
    const transactions = [
      {
        hash: "0x1",
        timestamp: 1000,
        type: "MarketRepay" as const,
        user: { address: "0x123" },
      },
    ];

    const firstBorrow = getFirstBorrowTimestamp(transactions);
    expect(firstBorrow).toBeNull();
  });

  it("should filter transactions by user address correctly", async () => {
    const borrowers = await getAllBorrowers(137);

    if (borrowers.length === 0) {
      return;
    }

    const borrower = borrowers[0];
    const marketKey = borrower.marketKey;
    const chainId = 137;
    const now = Math.floor(Date.now() / 1000);
    const start = now - 30 * 24 * 60 * 60;

    console.log(`\nComparing filtered vs unfiltered queries`);

    const allTransactions = await getMarketTransactions(marketKey, chainId, start, now);
    const filteredTransactions = await getMarketTransactions(
      marketKey,
      chainId,
      start,
      now,
      borrower.address
    );

    const matchingInUnfiltered = allTransactions.filter(
      (tx) => tx.user.address.toLowerCase() === borrower.address.toLowerCase()
    ).length;

    console.log(`All transactions: ${allTransactions.length}`);
    console.log(`Filtered transactions: ${filteredTransactions.length}`);
    console.log(`Matching transactions in unfiltered set: ${matchingInUnfiltered}`);
    console.log(
      `Filtered set matches: ${filteredTransactions.length === matchingInUnfiltered}`
    );

    expect(filteredTransactions.length).toBe(matchingInUnfiltered);
  }, 30000);
});
