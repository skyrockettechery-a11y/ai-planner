interface DailyOverviewProps {
  total: number;
  completed: number;
  active: number;
}

export function DailyOverview({
  total,
  completed,
  active,
}: DailyOverviewProps) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <section
      aria-label="Daily overview"
      className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Today
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900 sm:text-xl">
            {active === 0 && total > 0
              ? "All tasks done"
              : `${active} active task${active === 1 ? "" : "s"}`}
          </h2>
        </div>
        <p className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">{completed}</span> of{" "}
          <span className="font-semibold text-zinc-900">{total}</span> completed
        </p>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-zinc-800 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
