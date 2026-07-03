export function CompletionBar({ done, total, pct }: { done: number; total: number; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-neutral-500">阅读进度</span>
        <span className="cjk text-sm font-medium">读完 {done} / {total}</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-pill bg-surface-soft">
        <div className="h-full rounded-pill bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
