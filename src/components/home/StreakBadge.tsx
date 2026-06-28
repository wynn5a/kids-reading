export function StreakBadge({ streak }: { streak: number }) {
  return (
    <div className="cjk inline-flex items-center gap-2 rounded-pill bg-block-lime px-4 py-2">
      <span className="text-xl">🔥</span>
      <span className="font-medium">连续 {streak} 天</span>
    </div>
  );
}
