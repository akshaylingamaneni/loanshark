import { describe, expect, it } from "vitest";

import { calculateDailyReimbursement } from "../calculator";
import { SECONDS_PER_YEAR } from "../constants";

const DAY = 86_400;

const dayStart = 1_700_000_000;
const dayEnd = dayStart + DAY;

function expectedInterest(principal: number, apy: number, seconds: number) {
  const rate = Math.log(1 + apy) / SECONDS_PER_YEAR;
  return principal * (Math.exp(rate * seconds) - 1);
}

describe("calculateDailyReimbursement", () => {
  it("computes reimbursement with constant rate above cap", () => {
    const startingPrincipal = 1_000;
    const marketApy = 0.2;
    const capApr = 0.1;

    const result = calculateDailyReimbursement({
      dayStart,
      dayEnd,
      startingPrincipal,
      capApr,
      ratePoints: [{ timestamp: dayStart, apy: marketApy }],
    });

    const actual = expectedInterest(startingPrincipal, marketApy, DAY);
    const capped = expectedInterest(startingPrincipal, capApr, DAY);

    expect(result.actualInterest).toBeCloseTo(actual, 1e-6);
    expect(result.cappedInterest).toBeCloseTo(capped, 1e-6);
    expect(result.reimbursement).toBeCloseTo(actual - capped, 1e-6);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it("handles mid-day repayment events", () => {
    const startingPrincipal = 1_000;
    const marketApy = 0.15;
    const capApr = 0.1;
    const repayment = 400;
    const halfDay = DAY / 2;

    const result = calculateDailyReimbursement({
      dayStart,
      dayEnd,
      startingPrincipal,
      capApr,
      ratePoints: [{ timestamp: dayStart, apy: marketApy }],
      events: [{ timestamp: dayStart + halfDay, delta: -repayment }],
    });

    const firstLegInterest = expectedInterest(startingPrincipal, marketApy, halfDay);
    const principalAfterFirstLeg = startingPrincipal + firstLegInterest;
    const secondLegPrincipal = Math.max(0, principalAfterFirstLeg - repayment);
    const secondLegInterest = expectedInterest(secondLegPrincipal, marketApy, halfDay);
    const totalActual = firstLegInterest + secondLegInterest;

    const capFirstLeg = expectedInterest(startingPrincipal, capApr, halfDay);
    const capSecondLeg = expectedInterest(secondLegPrincipal, capApr, halfDay);
    const totalCap = capFirstLeg + capSecondLeg;

    expect(result.actualInterest).toBeCloseTo(totalActual, 1e-6);
    expect(result.cappedInterest).toBeCloseTo(totalCap, 1e-6);
    expect(result.reimbursement).toBeCloseTo(totalActual - totalCap, 1e-6);
    expect(result.eventsApplied).toHaveLength(1);
  });

  it("produces zero reimbursement when below cap", () => {
    const startingPrincipal = 5_000;
    const marketApy = 0.05;
    const capApr = 0.1;

    const result = calculateDailyReimbursement({
      dayStart,
      dayEnd,
      startingPrincipal,
      capApr,
      ratePoints: [{ timestamp: dayStart, apy: marketApy }],
    });

    expect(result.actualInterest).toBeLessThan(result.cappedInterest);
    expect(result.reimbursement).toBe(0);
  });

  it("falls back to zero APY when snapshots missing", () => {
    const startingPrincipal = 2_500;

    const result = calculateDailyReimbursement({
      dayStart,
      dayEnd,
      startingPrincipal,
      capApr: 0.12,
      ratePoints: [],
    });

    expect(result.actualInterest).toBe(0);
    expect(result.cappedInterest).toBe(0);
    expect(result.reimbursement).toBe(0);
    expect(result.segments).toHaveLength(1);
  });
});
