import "@tanstack/react-start/server-only";

/** Giới hạn tần suất theo khóa (IP) bằng cửa sổ trượt trong bộ nhớ. */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Trả về true nếu được phép và ghi nhận lượt gọi. */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    for (const [k, v] of this.hits) {
      if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
    }
  }
}
