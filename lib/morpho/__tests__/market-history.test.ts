import { describe, it, expect } from "vitest";
import {
  getHistoricalNetBorrowApy,
  calculateAverageApy,
  getDailyAverageApy,
} from "../market-history";
import { getMarkets } from "../markets";

describe("Market History Queries", () => {
  it("should fetch historical borrow APY for a market", async () => {
    const markets = await getMarkets([137]);

    if (markets.length === 0) {
      return;
    }

    const marketKey = markets[0].uniqueKey;
    const chainId = 137;
    const now = Math.floor(Date.now() / 1000);
    const start = now - 7 * 24 * 60 * 60;

    const apyPoints = await getHistoricalNetBorrowApy(marketKey, chainId, start, now);

    console.log(`\nHistorical APY Data for Market ${marketKey.slice(0, 10)}...`);
    console.log(`Found ${apyPoints.length} data points`);

    if (apyPoints.length > 0) {
      console.log("\nFirst 5 points:");
      apyPoints.slice(0, 5).forEach((point, i) => {
        const date = new Date(point.x * 1000).toISOString();
        const apyPercent = (point.y * 100).toFixed(2);
        console.log(`  ${i + 1}. ${date}: ${apyPercent}%`);
      });

      console.log("\nLast 5 points:");
      apyPoints.slice(-5).forEach((point, i) => {
        const date = new Date(point.x * 1000).toISOString();
        const apyPercent = (point.y * 100).toFixed(2);
        console.log(`  ${i + 1}. ${date}: ${apyPercent}%`);
      });

      const avgApy = calculateAverageApy(apyPoints);
      console.log(`\nAverage APY: ${(avgApy * 100).toFixed(2)}%`);
    }

    expect(apyPoints).toBeDefined();
    expect(Array.isArray(apyPoints)).toBe(true);
    if (apyPoints.length > 0) {
      expect(apyPoints[0]).toHaveProperty("x");
      expect(apyPoints[0]).toHaveProperty("y");
      expect(typeof apyPoints[0].x).toBe("number");
      expect(typeof apyPoints[0].y).toBe("number");
    }
  }, 30000);

  it("should calculate average APY correctly", () => {
    const points = [
      { x: 1000, y: 0.1 },
      { x: 2000, y: 0.15 },
      { x: 3000, y: 0.2 },
    ];

    const avg = calculateAverageApy(points);
    expect(avg).toBeCloseTo(0.15);
  });

  it("should return zero for empty array", () => {
    const avg = calculateAverageApy([]);
    expect(avg).toBe(0);
  });

  it("should get daily average APY", async () => {
    const markets = await getMarkets([137]);

    if (markets.length === 0) {
      return;
    }

    const marketKey = markets[0].uniqueKey;
    const chainId = 137;
    const now = Math.floor(Date.now() / 1000);
    const start = now - 7 * 24 * 60 * 60;

    const apyPoints = await getHistoricalNetBorrowApy(marketKey, chainId, start, now);

    if (apyPoints.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const dailyAvg = getDailyAverageApy(apyPoints, yesterday);
      console.log(`\nDaily Average APY for yesterday: ${(dailyAvg * 100).toFixed(2)}%`);
      expect(dailyAvg).toBeGreaterThanOrEqual(0);
    }
  }, 30000);

  it("should fetch historical APY for multiple markets", async () => {
    const markets = await getMarkets([137]);

    if (markets.length === 0) {
      return;
    }

    const chainId = 137;
    const now = Math.floor(Date.now() / 1000);
    const start = now - 3 * 24 * 60 * 60;

    console.log("\nTesting markets from API:\n");

    for (const market of markets.slice(0, 3)) {
      const apyPoints = await getHistoricalNetBorrowApy(market.uniqueKey, chainId, start, now);

      if (apyPoints.length > 0) {
        const avgApy = calculateAverageApy(apyPoints);
        const minApy = Math.min(...apyPoints.map((p) => p.y));
        const maxApy = Math.max(...apyPoints.map((p) => p.y));

        console.log(`Market: ${market.collateralAsset.symbol}/${market.loanAsset.symbol}`);
        console.log(`  Key: ${market.uniqueKey.slice(0, 10)}...`);
        console.log(`  Points: ${apyPoints.length}`);
        console.log(`  Avg APY: ${(avgApy * 100).toFixed(2)}%`);
        console.log(`  Min APY: ${(minApy * 100).toFixed(2)}%`);
        console.log(`  Max APY: ${(maxApy * 100).toFixed(2)}%`);
        console.log("");
      } else {
        console.log(
          `Market: ${market.collateralAsset.symbol}/${market.loanAsset.symbol} - No historical data found`
        );
      }

      expect(apyPoints).toBeDefined();
      expect(Array.isArray(apyPoints)).toBe(true);
    }
  }, 60000);
});
