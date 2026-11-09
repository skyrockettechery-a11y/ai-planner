import {
  availabilityFromNetworkFailure,
  type BusyFetchResult,
} from "@/lib/schedule/availability";
import {
  computePlanningWindow,
  generateSchedule,
  type GenerateScheduleInput,
  type PlanningWindow,
} from "@/lib/schedule/engine";
import type { ScheduleDraft } from "@/types/schedule";

/**
 * Fetch busy time, then generate a draft against the time *after* the fetch
 * (Mission 12 / P2A).
 *
 * The calendar request can be slow. Placing blocks with a `now` captured
 * before awaiting it could produce blocks that already start in the past by
 * the time the draft is shown, while the "past" check — evaluated at the
 * same stale instant — reports nothing. Reading the clock again after the
 * response fixes both.
 *
 * If the local day rolled over while waiting, the busy data describes the
 * wrong day, so it is fetched once more for the new day; if the clock is
 * still unstable after that, availability is reported as unknown rather
 * than trusted.
 */

export interface FreshScheduleInput
  extends Omit<GenerateScheduleInput, "busy" | "availability" | "now"> {
  fetchBusy: (window: PlanningWindow) => Promise<BusyFetchResult>;
  /** Injected for tests; `() => new Date()` in the app. */
  clock: () => Date;
}

export interface FreshScheduleResult {
  draft: ScheduleDraft;
  busyResult: BusyFetchResult;
  /** The instant the draft was generated and must be evaluated against. */
  now: Date;
}

function sameWindow(a: PlanningWindow, b: PlanningWindow): boolean {
  return a.start === b.start && a.end === b.end;
}

export async function buildFreshSchedule(
  input: FreshScheduleInput,
): Promise<FreshScheduleResult> {
  const { fetchBusy, clock, ...rest } = input;

  const requested = computePlanningWindow(clock(), rest.settings);
  let busyResult = await fetchBusy(requested);
  let now = clock();
  let current = computePlanningWindow(now, rest.settings);

  if (!sameWindow(requested, current)) {
    const retried = current;
    busyResult = await fetchBusy(retried);
    now = clock();
    current = computePlanningWindow(now, rest.settings);
    if (!sameWindow(retried, current)) {
      busyResult = {
        busy: [],
        errorCode: null,
        ...availabilityFromNetworkFailure(),
      };
    }
  }

  return {
    draft: generateSchedule({
      ...rest,
      busy: busyResult.busy,
      availability: busyResult.availability,
      now,
    }),
    busyResult,
    now,
  };
}
