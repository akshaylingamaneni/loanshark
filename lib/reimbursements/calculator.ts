import { SegmentDetail } from "@/lib/db/schema";

import { SECONDS_PER_HOUR } from "./constants";
import { apyToContinuousRate, growthFromRate } from "./math";
import type {
  DailyReimbursementInput,
  DailyReimbursementResult,
  PrincipalEvent,
  RatePoint,
} from "./types";

type RateSegment = {
  start: number;
  end: number;
  apy: number;
};

function sanitizeRatePoints(points: RatePoint[]): RatePoint[] {
  return points
    .map((point) => ({
      timestamp: Math.floor(Number(point.timestamp)),
      apy: Number(point.apy ?? 0),
    }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.apy))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function buildRateSegments(points: RatePoint[], start: number, end: number): RateSegment[] {
  if (end <= start) {
    return [];
  }

  const sanitized = sanitizeRatePoints(points);
  if (sanitized.length === 0) {
    return [{ start, end, apy: 0 }];
  }

  const boundaries = new Set<number>([start, end]);
  for (const point of sanitized) {
    if (point.timestamp > start && point.timestamp < end) {
      boundaries.add(point.timestamp);
    }
  }

  const orderedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const segments: RateSegment[] = [];

  let latestIndex = -1;
  for (let i = 0; i < sanitized.length; i++) {
    if (sanitized[i].timestamp <= start) {
      latestIndex = i;
    } else {
      break;
    }
  }

  let lastApy = latestIndex >= 0 ? sanitized[latestIndex].apy : sanitized[0].apy;

  for (let i = 0; i < orderedBoundaries.length - 1; i++) {
    const segStart = orderedBoundaries[i]!;
    const segEnd = orderedBoundaries[i + 1]!;
    if (segEnd <= segStart) continue;

    while (latestIndex + 1 < sanitized.length && sanitized[latestIndex + 1]!.timestamp <= segStart) {
      latestIndex++;
      lastApy = sanitized[latestIndex]!.apy;
    }

    segments.push({ start: segStart, end: segEnd, apy: lastApy });
  }

  return segments;
}

function normalizeEvents(events: PrincipalEvent[] | undefined, start: number, end: number) {
  return (events ?? [])
    .map((event) => ({
      ...event,
      timestamp: Math.floor(Number(event.timestamp)),
      delta: Number(event.delta),
    }))
    .filter(
      (event) =>
        Number.isFinite(event.timestamp) &&
        Number.isFinite(event.delta) &&
        event.timestamp >= start &&
        event.timestamp <= end
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function accrueSegment(
  principal: number,
  apy: number,
  capApr: number,
  deltaSeconds: number,
  start: number,
  end: number
): { detail: SegmentDetail; interest: number; cappedInterest: number; principalAfterGrowth: number } {
  if (deltaSeconds <= 0) {
    return {
      detail: {
        start,
        end,
        apy,
        capApr,
        deltaSeconds,
        principalBefore: principal,
        principalAfter: principal,
        interestAccrued: 0,
        cappedInterestAccrued: 0,
      },
      interest: 0,
      cappedInterest: 0,
      principalAfterGrowth: principal,
    };
  }

  const rate = apyToContinuousRate(apy);
  const capRate = apyToContinuousRate(capApr);
  const growth = growthFromRate(rate, deltaSeconds);
  const capGrowth = growthFromRate(capRate, deltaSeconds);
  const principalAfterGrowth = principal * growth;
  const interest = principalAfterGrowth - principal;
  const cappedInterest = principal * (capGrowth - 1);

  return {
    detail: {
      start,
      end,
      apy,
      capApr,
      deltaSeconds,
      principalBefore: principal,
      principalAfter: principalAfterGrowth,
      interestAccrued: interest,
      cappedInterestAccrued: cappedInterest,
    },
    interest,
    cappedInterest,
    principalAfterGrowth,
  };
}

export function calculateDailyReimbursement(
  input: DailyReimbursementInput
): DailyReimbursementResult {
  const { dayStart, dayEnd, startingPrincipal, capApr, ratePoints } = input;

  if (dayEnd <= dayStart) {
    throw new Error("dayEnd must be greater than dayStart");
  }

  const segments = buildRateSegments(ratePoints, dayStart, dayEnd);
  const events = normalizeEvents(input.events, dayStart, dayEnd);

  let principal = Math.max(0, startingPrincipal);
  let actualInterest = 0;
  let cappedInterest = 0;
  let eventIndex = 0;

  const details: SegmentDetail[] = [];
  const appliedEvents: PrincipalEvent[] = [];

  // Apply events that happen exactly at the start timestamp
  while (eventIndex < events.length && events[eventIndex]!.timestamp === dayStart) {
    principal = Math.max(0, principal + events[eventIndex]!.delta);
    appliedEvents.push(events[eventIndex]!);
    eventIndex++;
  }

  for (const segment of segments) {
    let cursor = segment.start;

    while (cursor < segment.end) {
      // Apply any events that might have the same timestamp as the cursor
      while (eventIndex < events.length && events[eventIndex]!.timestamp === cursor) {
        principal = Math.max(0, principal + events[eventIndex]!.delta);
        appliedEvents.push(events[eventIndex]!);
        eventIndex++;
      }

      const nextEvent = events[eventIndex];
      const boundary =
        nextEvent && nextEvent.timestamp > cursor && nextEvent.timestamp < segment.end
          ? nextEvent.timestamp
          : segment.end;

      const deltaSeconds = Math.min(boundary, segment.end) - cursor;
      if (deltaSeconds > 0) {
        const { detail, interest, cappedInterest: capped } = accrueSegment(
          principal,
          segment.apy,
          capApr,
          deltaSeconds,
          cursor,
          boundary
        );

        principal = detail.principalAfter;
        actualInterest += interest;
        cappedInterest += capped;
        details.push(detail);
      }

      cursor = boundary;
    }
  }

  // Apply any remaining events that are exactly at the dayEnd timestamp
  while (eventIndex < events.length && events[eventIndex]!.timestamp === dayEnd) {
    principal = Math.max(0, principal + events[eventIndex]!.delta);
    appliedEvents.push(events[eventIndex]!);
    eventIndex++;
  }

  const reimbursement = Math.max(0, actualInterest - cappedInterest);

  return {
    endingPrincipal: principal,
    actualInterest,
    cappedInterest,
    reimbursement,
    segments: details,
    eventsApplied: appliedEvents,
  };
}

export function buildHourlyRatePoints(ratePoints: RatePoint[], start: number, end: number) {
  const sanitized = sanitizeRatePoints(ratePoints);
  if (sanitized.length === 0) {
    return [];
  }

  const hourly: RatePoint[] = [];
  let cursor = start;
  let index = sanitized.findIndex((point) => point.timestamp >= start);
  if (index === -1) {
    index = sanitized.length - 1;
  }

  let currentApy = sanitized[index]?.apy ?? sanitized[sanitized.length - 1]!.apy;

  while (cursor < end) {
    while (index < sanitized.length && sanitized[index]!.timestamp <= cursor) {
      currentApy = sanitized[index]!.apy;
      index++;
    }

    hourly.push({ timestamp: cursor, apy: currentApy });
    cursor += SECONDS_PER_HOUR;
  }

  return hourly;
}
