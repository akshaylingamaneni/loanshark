import { SECONDS_PER_YEAR } from "./constants";

export function apyToContinuousRate(apy: number): number {
  if (!Number.isFinite(apy)) {
    throw new Error("APY must be a finite number");
  }
  if (apy <= -1) {
    throw new Error("APY must be greater than -100%");
  }

  return Math.log(1 + apy) / SECONDS_PER_YEAR;
}

export function growthFromRate(rate: number, deltaSeconds: number): number {
  if (deltaSeconds <= 0) {
    return 1;
  }
  return Math.exp(rate * deltaSeconds);
}

export function apyToGrowth(apy: number, deltaSeconds: number): number {
  return growthFromRate(apyToContinuousRate(apy), deltaSeconds);
}
