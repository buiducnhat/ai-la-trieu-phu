export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng = Math.random): T {
  if (items.length === 0) throw new Error("pick from empty list");
  return items[Math.floor(rng() * items.length)] as T;
}

/** Xáo trộn 4 phương án và trả về chỉ số mới của đáp án đúng. */
export function shuffleOptions(
  options: readonly [string, string, string, string],
  answer: number,
  rng: Rng = Math.random,
): { options: [string, string, string, string]; answer: number } {
  const order = shuffle([0, 1, 2, 3], rng);
  const shuffled = order.map((i) => options[i]) as [string, string, string, string];
  return { options: shuffled, answer: order.indexOf(answer) };
}
