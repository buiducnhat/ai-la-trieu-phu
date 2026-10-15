"use client";

import { useEffect, useState } from "react";

/** Hiện dần từng ký tự (hiệu ứng máy đánh chữ). */
export function useTypewriter(text: string, active: boolean, charMs = 28): string {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, charMs);
    return () => clearInterval(id);
  }, [text, active, charMs]);
  return active ? text.slice(0, count) : "";
}

/** Đếm ngược theo giây; bắt đầu khi `running` bật lên. */
export function useCountdown(seconds: number, running: boolean): number {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, seconds - (Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, [seconds, running]);
  return left;
}
