import confetti from "canvas-confetti";

/** A single cheerful burst for finishing one lesson. Respects reduced motion. */
export function celebrate() {
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 45,
    origin: { y: 0.7 },
    disableForReducedMotion: true,
  });
}

/** A bigger two-cannon burst for finishing the very last lesson (全部读完啦). */
export function celebrateBig() {
  const base = {
    startVelocity: 55,
    spread: 90,
    ticks: 220,
    disableForReducedMotion: true,
  };
  confetti({ ...base, particleCount: 120, angle: 60, origin: { x: 0.1, y: 0.8 } });
  confetti({ ...base, particleCount: 120, angle: 120, origin: { x: 0.9, y: 0.8 } });
  setTimeout(
    () => confetti({ ...base, particleCount: 80, origin: { y: 0.6 } }),
    250,
  );
}
