import type { SegmentDetail } from "@/lib/db/schema";

export type RatePoint = {
  timestamp: number;
  apy: number;
};

export type PrincipalEvent = {
  timestamp: number;
  delta: number; // positive = borrow (principal increases), negative = repay
  hash?: string;
  type?: string;
};

export type DailyReimbursementInput = {
  dayStart: number;
  dayEnd: number;
  startingPrincipal: number;
  capApr: number;
  ratePoints: RatePoint[];
  events?: PrincipalEvent[];
};

export type DailyReimbursementResult = {
  endingPrincipal: number;
  actualInterest: number;
  cappedInterest: number;
  reimbursement: number;
  segments: SegmentDetail[];
  eventsApplied: PrincipalEvent[];
};
