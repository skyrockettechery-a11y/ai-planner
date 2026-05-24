"use client";

interface ImportLocalBannerProps {
  importableCount: number;
  onImport: () => void;
  onDismiss: () => void;
}

export function ImportLocalBanner({
  importableCount,
  onImport,
  onDismiss,
}: ImportLocalBannerProps) {
  if (importableCount === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <p className="text-sm text-zinc-700">
        {importableCount} local task{importableCount === 1 ? "" : "s"} on this
        device can be imported to your cloud account.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onImport}
          className="min-h-9 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
        >
          Import local tasks
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-9 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
