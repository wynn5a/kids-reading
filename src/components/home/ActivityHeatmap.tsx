import type { HeatCell } from "@/lib/progress";

function shade(count: number): string {
  if (count <= 0) return "bg-surface-soft";
  if (count === 1) return "bg-block-mint";
  if (count === 2) return "bg-block-lime";
  return "bg-primary";
}

export function ActivityHeatmap({ cells }: { cells: HeatCell[] }) {
  return (
    <div className="cjk">
      <p className="text-sm text-neutral-500">最近活动</p>
      <div className="mt-2 grid grid-flow-col grid-rows-7 gap-1">
        {cells.map((c) => (
          <div key={c.date} title={`${c.date}: ${c.count}`} className={`h-3 w-3 rounded-sm ${shade(c.count)}`} />
        ))}
      </div>
    </div>
  );
}
